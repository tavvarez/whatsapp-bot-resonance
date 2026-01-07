import type { Browser, BrowserContext, Page } from "playwright";
import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import { logger } from "../../shared/utils/logger.js";
import { config } from "../../config/index.js";

chromium.use(stealth());

/**
 * Configuração do pool de browsers
 */
export interface BrowserPoolConfig {
  /** Tempo máximo de vida do browser (em ms) - padrão: 24h */
  maxBrowserLifetime?: number;
  /** Número máximo de páginas simultâneas - padrão: 3 */
  maxPages?: number;
  /** Timeout para considerar browser morto (em ms) - padrão: 5min */
  healthCheckTimeout?: number;
}

/**
 * Pool de browsers persistentes para reutilização de sessões.
 * Mantém o browser aberto para evitar re-validação do Cloudflare.
 * 
 * Benefícios:
 * - Cookies e sessões persistentes
 * - Cloudflare já validado
 * - Mais rápido (não precisa reabrir browser)
 * - Simula comportamento de usuário real
 */
export class BrowserPool {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private pages: Page[] = [];
  private browserStartTime: number = 0;
  private isShuttingDown = false;

  private readonly maxBrowserLifetime: number;
  private readonly maxPages: number;
  private readonly healthCheckTimeout: number;

  constructor(config: BrowserPoolConfig = {}) {
    this.maxBrowserLifetime = config.maxBrowserLifetime ?? 24 * 60 * 60 * 1000; // 24h
    this.maxPages = config.maxPages ?? 3;
    this.healthCheckTimeout = config.healthCheckTimeout ?? 5 * 60 * 1000; // 5min
  }

  /**
   * Inicializa o browser pool
   */
  async initialize(): Promise<void> {
    if (this.browser) {
      logger.warn("Browser pool já inicializado");
      return;
    }

    logger.info("🌐 Inicializando browser pool...");
    await this.createBrowser();
    logger.success("Browser pool inicializado com sucesso");
  }

  /**
   * Cria um novo browser e context
   */
  private async createBrowser(): Promise<void> {
    const isBootstrap = process.env.SCRAPER_BOOTSTRAP === "true";

    this.browser = await chromium.launch({
      headless: !isBootstrap,
      slowMo: isBootstrap ? 50 : 0,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });

    // Configura proxy se disponível
    const contextOptions: any = {
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1920, height: 1080 },
      locale: "pt-BR",
      timezoneId: "America/Sao_Paulo",
      geolocation: { latitude: -23.5505, longitude: -46.6333 },
      permissions: ["geolocation"],
    };

    const proxyServer = config.scraper.proxyServer?.trim();
    if (proxyServer) {
      const proxyConfig = this.parseProxyConfig(proxyServer);
      if (proxyConfig) {
        contextOptions.proxy = proxyConfig;
        const maskedUser = proxyConfig.username.slice(0, 4) + "****";
        logger.info(
          `🌐 Proxy configurado: ${proxyConfig.server.replace(/^https?:\/\//, "")} (user: ${maskedUser})`
        );
      }
    }

    // Tenta carregar sessão salva
    try {
      const fs = await import("node:fs/promises");
      await fs.access("rubinot-state.json");
      contextOptions.storageState = "rubinot-state.json";
      logger.info("📂 Sessão anterior restaurada");
    } catch {
      logger.info("📂 Iniciando nova sessão");
    }

    this.context = await this.browser.newContext(contextOptions);
    this.browserStartTime = Date.now();

    logger.debug("Browser criado", {
      proxy: !!proxyServer,
      sessionRestored: !!contextOptions.storageState,
    });
  }

  /**
   * Parse da configuração de proxy
   */
  private parseProxyConfig(proxyServer: string): {
    server: string;
    username: string;
    password: string;
  } | undefined {
    try {
      const url = new URL(proxyServer);
      const { protocol, hostname, port, username, password } = url;

      if (!hostname || !port || !username || !password) {
        logger.error("Proxy incompleto");
        return undefined;
      }

      return {
        server: `${protocol}//${hostname}:${port}`,
        username,
        password,
      };
    } catch {
      logger.error("Formato de proxy inválido");
      return undefined;
    }
  }

  /**
   * Obtém uma página do pool (reutiliza ou cria nova)
   */
  async acquirePage(): Promise<Page> {
    if (this.isShuttingDown) {
      throw new Error("Browser pool está sendo encerrado");
    }

    // Verifica se precisa renovar browser (24h)
    if (this.shouldRenewBrowser()) {
      logger.info("♻️ Renovando browser (tempo de vida expirado)");
      await this.renewBrowser();
    }

    // Verifica se browser está saudável
    if (!(await this.isHealthy())) {
      logger.warn("⚠️ Browser não saudável, renovando...");
      await this.renewBrowser();
    }

    // Reutiliza página existente se disponível
    if (this.pages.length > 0) {
      const page = this.pages.shift()!;
      logger.debug("♻️ Reutilizando página existente");
      return page;
    }

    // Cria nova página se não atingiu o limite
    if (!this.context) {
      throw new Error("Context não inicializado");
    }

    const page = await this.context.newPage();
    logger.debug("📄 Nova página criada");
    return page;
  }

  /**
   * Devolve a página ao pool para reutilização
   */
  async releasePage(page: Page, saveSession = false): Promise<void> {
    try {
      // Salva sessão se solicitado (cookies atualizados)
      if (saveSession && this.context) {
        await this.context.storageState({ path: "rubinot-state.json" });
        logger.debug("💾 Sessão atualizada");
      }

      // Se não atingiu o limite, mantém no pool
      if (this.pages.length < this.maxPages) {
        this.pages.push(page);
        logger.debug(`♻️ Página devolvida ao pool (${this.pages.length}/${this.maxPages})`);
      } else {
        // Senão, fecha a página
        await page.close();
        logger.debug("🗑️ Página fechada (pool cheio)");
      }
    } catch (error) {
      logger.error("Erro ao devolver página", error);
      try {
        await page.close();
      } catch {}
    }
  }

  /**
   * Executa uma ação com uma página do pool
   */
  async withPage<T>(
    action: (page: Page) => Promise<T>,
    saveSession = false
  ): Promise<T> {
    const page = await this.acquirePage();
    try {
      const result = await action(page);
      await this.releasePage(page, saveSession);
      return result;
    } catch (error) {
      // Em caso de erro, fecha a página (pode estar corrompida)
      try {
        await page.close();
      } catch {}
      throw error;
    }
  }

  /**
   * Verifica se deve renovar o browser (tempo de vida)
   */
  private shouldRenewBrowser(): boolean {
    const age = Date.now() - this.browserStartTime;
    return age > this.maxBrowserLifetime;
  }

  /**
   * Verifica se o browser está saudável
   */
  private async isHealthy(): Promise<boolean> {
    if (!this.browser || !this.browser.isConnected()) {
      return false;
    }

    try {
      // Tenta criar uma página de teste
      const testPage = await this.context!.newPage();
      await testPage.close();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Renova o browser (fecha e abre novo)
   */
  private async renewBrowser(): Promise<void> {
    logger.info("♻️ Renovando browser...");

    // Fecha páginas abertas
    for (const page of this.pages) {
      try {
        await page.close();
      } catch {}
    }
    this.pages = [];

    // Fecha browser antigo
    if (this.browser) {
      try {
        await this.browser.close();
      } catch {}
    }

    // Cria novo browser
    await this.createBrowser();
    logger.success("Browser renovado com sucesso");
  }

  /**
   * Encerra o pool de browsers
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    logger.info("🛑 Encerrando browser pool...");

    // Fecha todas as páginas
    for (const page of this.pages) {
      try {
        await page.close();
      } catch (error) {
        logger.debug("Erro ao fechar página", error);
      }
    }
    this.pages = [];

    // Fecha browser
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (error) {
        logger.debug("Erro ao fechar browser", error);
      }
      this.browser = null;
    }

    this.context = null;
    logger.success("Browser pool encerrado");
  }

  /**
   * Retorna estatísticas do pool
   */
  getStats() {
    return {
      isInitialized: !!this.browser,
      isHealthy: this.browser?.isConnected() ?? false,
      pagesInPool: this.pages.length,
      maxPages: this.maxPages,
      browserAge: Date.now() - this.browserStartTime,
      maxBrowserLifetime: this.maxBrowserLifetime,
      shouldRenew: this.shouldRenewBrowser(),
    };
  }
}

/**
 * Instância singleton do browser pool
 */
export const browserPool = new BrowserPool({
  maxBrowserLifetime: 24 * 60 * 60 * 1000, // 24 horas
  maxPages: 3, // Máximo 3 páginas simultâneas
  healthCheckTimeout: 5 * 60 * 1000, // 5 minutos
});

