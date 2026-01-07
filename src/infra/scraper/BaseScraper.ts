import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import type { Browser, BrowserContext, Page } from "playwright";
import { config } from "../../config/index.js";
import { logger } from "../../shared/utils/logger.js";
import { CloudflareBlockedError } from "../../shared/errors/index.js";

// Aplica plugin stealth globalmente
chromium.use(stealth());

/**
 * Configurações para criação do browser context
 */
export interface BrowserContextConfig {
  proxy?: {
    server: string;
    username: string;
    password: string;
  };
  userAgent?: string;
  viewport?: { width: number; height: number };
  locale?: string;
  timezoneId?: string;
  geolocation?: { latitude: number; longitude: number };
  permissions?: string[];
}

/**
 * Classe base abstrata para scrapers do Rubinot.
 * Centraliza lógica comum de proxy, Cloudflare, delays humanos, etc.
 */
export abstract class BaseScraper {
  protected readonly baseUrl = "https://rubinot.com.br";

  /**
   * Converte o formato de proxy do IPRoyal (user:pass:host:port)
   * para o formato do Playwright (http://user:pass@host:port)
   */
  protected normalizeProxyUrl(proxyString: string): string {
    // Se já está no formato http://, retorna como está
    if (
      proxyString.startsWith("http://") ||
      proxyString.startsWith("https://")
    ) {
      return proxyString;
    }

    // Formato IPRoyal: user:pass:host:port
    const parts = proxyString.split(":");

    if (parts.length === 4) {
      const [user, pass, host, port] = parts;
      return `http://${user}:${pass}@${host}:${port}`;
    }

    // Se não conseguir parsear, retorna como está
    logger.warn(`Formato de proxy não reconhecido: ${proxyString}`);
    return proxyString;
  }

  /**
   * Cria configuração de proxy a partir da string de configuração
   */
  protected createProxyConfig(proxyServer: string): {
    server: string;
    username: string;
    password: string;
  } | undefined {
    if (!proxyServer) return undefined;

    let url: URL;

    try {
      url = new URL(proxyServer);
    } catch {
      logger.error(
        "Formato de proxy inválido. Use http://user:pass@host:port"
      );
      return undefined;
    }

    const { protocol, hostname, port, username, password } = url;

    if (!hostname || !port || !username || !password) {
      logger.error("Proxy incompleto. Verifique user, pass, host e port");
      return undefined;
    }

    return {
      server: `${protocol}//${hostname}:${port}`,
      username,
      password,
    };
  }

  /**
   * Adiciona delay aleatório para simular comportamento humano
   */
  protected async humanDelay(
    page: Page,
    min = 300,
    max = 800
  ): Promise<void> {
    const delay = Math.random() * (max - min) + min;
    await page.waitForTimeout(delay);
  }

  /**
   * Detecta se a página está bloqueada pelo Cloudflare
   */
  protected async detectCloudflare(page: Page): Promise<boolean> {
    try {
      await page
        .waitForLoadState("domcontentloaded", { timeout: 5000 })
        .catch(() => {});

      const indicators = [
        "cf-browser-verification",
        "cf_chl_opt",
        "challenge-running",
        "Just a moment...",
        "Verify you are human",
        "Checking your browser",
        "cf-turnstile",
      ];

      const content = await page.content();
      const title = await page.title();

      return indicators.some((i) => content.includes(i) || title.includes(i));
    } catch {
      return true;
    }
  }

  /**
   * Aguarda o Cloudflare liberar o acesso
   */
  protected async waitForCloudflare(
    page: Page,
    timeoutMs = 45000
  ): Promise<boolean> {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      if (!(await this.detectCloudflare(page))) {
        logger.success("Cloudflare liberou!");
        return true;
      }
      logger.info("⏳ Aguardando Cloudflare...");
      await page.waitForTimeout(2000);
    }

    return false;
  }

  /**
   * Cria um browser com as configurações padrão
   */
  protected async createBrowser(headless = true): Promise<Browser> {
    return await chromium.launch({
      headless,
      slowMo: headless ? 0 : 50,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });
  }

  /**
   * Cria um context com configurações padrão + proxy (se configurado)
   */
  protected async createContext(
    browser: Browser,
    options?: Partial<BrowserContextConfig>
  ): Promise<BrowserContext> {
    const proxyServer = config.scraper.proxyServer?.trim();
    const proxyConfig = proxyServer
      ? this.createProxyConfig(proxyServer)
      : undefined;

    if (proxyConfig) {
      const maskedUser = proxyConfig.username.slice(0, 4) + "****";
      logger.info(
        `🌐 Usando proxy: ${proxyConfig.server.replace(/^https?:\/\//, "")} (user: ${maskedUser})`
      );
    } else {
      logger.info("🌐 Rodando sem proxy");
    }

    const contextOptions: any = {
      userAgent:
        options?.userAgent ||
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: options?.viewport || { width: 1920, height: 1080 },
      locale: options?.locale || "pt-BR",
      timezoneId: options?.timezoneId || "America/Sao_Paulo",
    };

    // Adiciona propriedades opcionais apenas se definidas
    if (options?.geolocation) {
      contextOptions.geolocation = options.geolocation;
    }
    if (options?.permissions) {
      contextOptions.permissions = options.permissions;
    }
    if (proxyConfig) {
      contextOptions.proxy = proxyConfig;
    }

    return await browser.newContext(contextOptions);
  }

  /**
   * Máscara para esconder dados sensíveis em logs
   */
  protected maskSensitiveData(data: string, visibleChars = 4): string {
    if (data.length <= visibleChars) return "****";
    return data.slice(0, visibleChars) + "****";
  }
}

