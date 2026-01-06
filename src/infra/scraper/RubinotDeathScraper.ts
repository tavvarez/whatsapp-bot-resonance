import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import crypto from "node:crypto";
import type { Page, BrowserContext } from "playwright";
import type { DeathEvent } from "../../domain/entities/DeathEvent.js";
import type {
  DeathScraper,
  FetchDeathsParams,
  FetchDeathsOptions,
} from "../../domain/scrapers/DeathScraper.js";
import { log } from "../../shared/utils/logger.js";
import {
  CloudflareBlockedError,
  ParseError,
  ScraperError,
} from "../../shared/errors/index.js";
import { config } from "../../config/index.js";

// Aplica o plugin stealth para evitar detecção
chromium.use(stealth());

export class RubinotDeathScraper implements DeathScraper {
  private async humanDelay(page: Page, min = 500, max = 1500): Promise<void> {
    const delay = Math.random() * (max - min) + min;
    await page.waitForTimeout(delay);
  }

  /**
   * Converte o formato de proxy do IPRoyal (user:pass:host:port)
   * para o formato do Playwright (http://user:pass@host:port)
   */
  private normalizeProxyUrl(proxyString: string): string {
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
    log(`⚠️ Formato de proxy não reconhecido: ${proxyString}`);
    return proxyString;
  }

  private async detectCloudflare(page: Page): Promise<boolean> {
    const cloudflareIndicators = [
      "cf-browser-verification",
      "cf_chl_opt",
      "challenge-running",
      "Just a moment...",
      "Checking your browser",
      "cf-turnstile",
      "Verify you are human",
    ];

    const pageContent = await page.content();
    console.log("Page Content", pageContent)
    const pageTitle = await page.title();
    console.log("Page Title", pageTitle)

    return cloudflareIndicators.some(
      (indicator) =>
        pageContent.includes(indicator) || pageTitle.includes(indicator)
    );
  }

  private async waitForCloudflareToPass(
    page: Page,
    timeoutMs = 45000
  ): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const isCloudflare = await this.detectCloudflare(page);

      if (!isCloudflare) {
        log("✅ Cloudflare liberou!");
        return true;
      }

      log("⏳ Aguardando Cloudflare...");
      await page.waitForTimeout(3000);
    }

    return false;
  }

  private async submitForm(
    page: Page,
    world: string,
    guild: string
  ): Promise<void> {
    // Passo 1: Navega para a página
    page.on("response", async (response) => {
      if (response.url().includes("rubinot")) {
        console.log(
          "📡 RESPONSE",
          response.status(),
          response.url()
        );
      }
    });
    await page.goto("https://rubinot.com.br/?subtopic=latestdeaths", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    // 🔴 LOG CRÍTICO
    const url = page.url();
    const title = await page.title();
    const html = await page.content();

    console.log("🌐 URL atual:", url);
    console.log("📄 Title:", title);
    console.log("📄 HTML length:", html.length);

    // Verifica Cloudflare e espera passar
    if (await this.detectCloudflare(page)) {
      log("🛡️ Cloudflare detectado, aguardando liberação...");
      const passed = await this.waitForCloudflareToPass(page, 45000);

      if (!passed) {
        throw new CloudflareBlockedError();
      }
    }

    await this.humanDelay(page);

    // Passo 2: Seleciona o World e faz o primeiro submit
    await page.waitForSelector('select[name="world"]', {
      state: "visible",
      timeout: 30000,
    });

    await this.humanDelay(page);
    await page.selectOption('select[name="world"]', world);
    await this.humanDelay(page);

    // Primeiro submit
    await page.click('input.BigButtonText[type="submit"]');
    await page.waitForLoadState("domcontentloaded");
    await this.humanDelay(page);

    // Passo 3: Agora seleciona a Guild e faz o segundo submit
    await page.waitForSelector('select[name="guild"]', {
      state: "visible",
      timeout: 30000,
    });

    await this.humanDelay(page);
    await page.selectOption('select[name="guild"]', guild);
    await this.humanDelay(page);

    // Espera a tabela de deaths aparecer
    await page.waitForSelector("table.TableContent", { timeout: 30000 });
  }

  private async doFetch(
    context: BrowserContext,
    world: string,
    guild: string
  ): Promise<DeathEvent[]> {
    const page = await context.newPage();

    try {
      await this.submitForm(page, world, guild);

      const rows = await page.$$eval("table.TableContent tr", (trs) =>
        trs
          .map((tr) => tr.textContent?.trim() ?? "")
          .filter((text) => text.includes(" died at level "))
      );

      // Salva o estado atualizado (cookies renovados)
      await context.storageState({ path: "rubinot-state.json" });

      return rows.map((raw) => this.parseRow(raw, world, guild));
    } finally {
      await page.close();
    }
  }

  async fetch(
    { world, guild }: FetchDeathsParams,
    options: FetchDeathsOptions = {}
  ): Promise<DeathEvent[]> {
    const { maxRetries = 5, retryDelayMs = 10000 } = options;

    const browser = await chromium.launch({
      headless: true,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });

    // Verifica se o arquivo de estado existe
    const fs = await import("node:fs/promises");
    let hasStorageState = false;

    try {
      await fs.access("rubinot-state.json");
      hasStorageState = true;
      log("📂 Usando sessão salva do Rubinot");
    } catch {
      log("📂 Nenhuma sessão salva, iniciando nova");
    }

// Prepara opções de proxy (formato correto para Playwright + IPRoyal)
const proxyServer = config.scraper.proxyServer?.trim();

type ProxyConfig = {
  server: string;
  username: string;
  password: string;
};

let proxyConfig: ProxyConfig | undefined;

if (proxyServer) {
  let url: URL;

  try {
    url = new URL(proxyServer);
  } catch {
    throw new Error(
      "Formato de proxy inválido. Use http://user:pass@host:port"
    );
  }

  const { protocol, hostname, port, username, password } = url;

  if (!hostname || !port || !username || !password) {
    throw new Error(
      "Proxy incompleto. Verifique user, pass, host e port"
    );
  }

  proxyConfig = {
    server: `${protocol}//${hostname}:${port}`,
    username,
    password,
  };

  const maskedUser = username.slice(0, 4) + "****";
  log(`🌐 Usando proxy: ${hostname}:${port} (user: ${maskedUser})`);
} else {
  log("🌐 Rodando sem proxy");
}

if (proxyConfig) {
  console.log("🔐 Proxy server:", proxyConfig.server);
  console.log("🔐 Proxy auth: username/password OK");
}


    const contextOptionsBase = {
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1920, height: 1080 },
      locale: "pt-BR",
      timezoneId: "America/Sao_Paulo",
      geolocation: { latitude: -23.5505, longitude: -46.6333 },
      permissions: ["geolocation"],
    };

    const contextOptions = proxyConfig
      ? { ...contextOptionsBase, proxy: proxyConfig }
      : contextOptionsBase;

    const context = hasStorageState
      ? await browser.newContext({
          ...contextOptions,
          storageState: "rubinot-state.json",
        })
      : await browser.newContext(contextOptions);

    try {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          log(`🔄 Tentativa ${attempt}/${maxRetries}...`);

          const deaths = await this.doFetch(context, world, guild);

          log(`✅ Sucesso! ${deaths.length} mortes encontradas.`);
          return deaths;
        } catch (error) {
          const isCloudflareError = error instanceof CloudflareBlockedError;

          console.warn(
            `⚠️ Tentativa ${attempt} falhou:`,
            isCloudflareError ? "Cloudflare bloqueou" : error
          );

          if (attempt === maxRetries) {
            if (isCloudflareError) {
              throw error;
            }
            throw new ScraperError(
              "Todas as tentativas de scraping falharam",
              error
            );
          }

          const delay = retryDelayMs * attempt;
          log(`⏳ Aguardando ${delay / 1000}s antes da próxima tentativa...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      throw new ScraperError("Todas as tentativas falharam");
    } finally {
      await browser.close();
    }
  }

  private parseRow(rawText: string, world: string, guild: string): DeathEvent {
    const normalized = rawText.replace(/\s+/g, " ").trim();

    const match = normalized.match(
      /(\d{1,2}\.\d{1,2}\.\d{4},\s*\d{1,2}:\d{2}:\d{2})\s+(.+?)\s+died at level\s+(\d+)/
    );

    if (!match) {
      throw new ParseError(`Formato inesperado de morte`, normalized);
    }

    const dateStr = match[1]!;
    const playerName = match[2]!;
    const level = Number(match[3]!);

    const [datePart, timePart] = dateStr.split(", ");
    const [day, month, year] = datePart!.split(".");

    const paddedDay = day!.padStart(2, "0");
    const paddedMonth = month!.padStart(2, "0");
    const normalizedTime = timePart!.replace(/^(\d):/, "0$1:");

    const isoDate = `${year}-${paddedMonth}-${paddedDay}T${normalizedTime}`;
    const occurredAt = new Date(isoDate);

    // ✅ Hash baseado em dados IMUTÁVEIS (sem rawText)
    const hash = crypto
      .createHash("sha1")
      .update(
        `${world}|${guild}|${playerName}|${occurredAt.toISOString()}|${level}`
      )
      .digest("hex");

    return {
      world,
      guild,
      playerName,
      level,
      occurredAt,
      rawText,
      hash,
    };
  }
}
