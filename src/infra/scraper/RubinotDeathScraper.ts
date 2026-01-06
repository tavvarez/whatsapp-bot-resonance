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
  private async humanDelay(page: Page, min = 1000, max = 3000): Promise<void> {
    const delay = Math.random() * (max - min) + min;
    await page.waitForTimeout(delay);
  }

  private readonly userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15",
  ];

  private getRandomUserAgent(): string {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)]!;
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

    // Se não conseguir parsear, retorna como está (pode dar erro depois)
    log(`⚠️ Formato de proxy não reconhecido: ${proxyString}`);
    return proxyString;
  }

  private async detectCloudflare(
    page: Page
  ): Promise<{ isBlocked: boolean; isPermanent: boolean }> {
    const pageContent = await page.content();
    const pageTitle = await page.title();

    // Indicadores de bloqueio PERMANENTE
    const permanentBlockIndicators = [
      "Sorry, you have been blocked",
      "Why have I been blocked?",
      "You are unable to access",
      "Attention Required! | Cloudflare",
      "blocked_why_headline",
      "block_headline",
      "unable_to_access",
    ];

    // Indicadores de CHALLENGE
    const challengeIndicators = [
      "cf-browser-verification",
      "cf_chl_opt",
      "challenge-running",
      "Just a moment...",
      "Checking your browser",
      "cf-turnstile",
      "Verify you are human",
    ];

    const isPermanentBlock = permanentBlockIndicators.some(
      (indicator) =>
        pageContent.includes(indicator) || pageTitle.includes(indicator)
    );

    if (isPermanentBlock) {
      return { isBlocked: true, isPermanent: true };
    }

    const isChallenge = challengeIndicators.some(
      (indicator) =>
        pageContent.includes(indicator) || pageTitle.includes(indicator)
    );

    return { isBlocked: isChallenge, isPermanent: false };
  }

  private async waitForCloudflareToPass(
    page: Page,
    timeoutMs = 45000
  ): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const { isBlocked, isPermanent } = await this.detectCloudflare(page);

      if (isPermanent) {
        log(
          "🚫 Bloqueio permanente detectado - IP foi bloqueado pelo Cloudflare"
        );
        return false;
      }

      if (!isBlocked) {
        log("✅ Cloudflare liberou!");
        return true;
      }

      log("⏳ Aguardando Cloudflare challenge passar...");
      await page.waitForTimeout(3000);
    }

    return false;
  }

  private async submitForm(
    page: Page,
    world: string,
    guild: string
  ): Promise<void> {
    await page.goto("https://rubinot.com.br/?subtopic=latestdeaths", {
      waitUntil: "networkidle",
      timeout: 70000,
    });
    await page.waitForTimeout(2000);

    const { isBlocked, isPermanent } = await this.detectCloudflare(page);

    if (isBlocked) {
      if (isPermanent) {
        log("🚫 IP bloqueado permanentemente pelo Cloudflare");
        throw new CloudflareBlockedError();
      } else {
        log("🛡️ Cloudflare challenge detectado, aguardando liberação...");
        const passed = await this.waitForCloudflareToPass(page, 45000);

        if (!passed) {
          throw new CloudflareBlockedError();
        }
        await page.waitForTimeout(2000);
      }
    }

    await this.humanDelay(page);

    const worldSelectors = ['select[name="world"]', 'select[name="server"]'];

    let worldSelector = null;
    for (const selector of worldSelectors) {
      try {
        await page.waitForSelector(selector, {
          state: "visible",
          timeout: 5000,
        });
        worldSelector = selector;
        break;
      } catch {
        continue;
      }
    }

    if (!worldSelector) {
      const html = await page.content();
      log(
        `❌ Selector de world não encontrado. HTML (primeiros 2000 chars): ${html.slice(
          0,
          2000
        )}`
      );
      throw new ScraperError("Não foi possível encontrar o seletor de world");
    }

    log(`✅ Usando seletor: ${worldSelector}`);
    await this.humanDelay(page);
    await page.selectOption(worldSelector, world);
    await this.humanDelay(page);

    await page.click('input.BigButtonText[type="submit"]');
    await page.waitForLoadState("networkidle");
    await this.humanDelay(page);

    const guildSelectors = ['select[name="guild"]', "select#guild"];

    let guildSelector = null;
    for (const selector of guildSelectors) {
      try {
        await page.waitForSelector(selector, {
          state: "visible",
          timeout: 5000,
        });
        guildSelector = selector;
        break;
      } catch {
        continue;
      }
    }

    if (!guildSelector) {
      throw new ScraperError("Não foi possível encontrar o seletor de guild");
    }

    log(`✅ Usando seletor: ${guildSelector}`);
    await this.humanDelay(page);
    await page.selectOption(guildSelector, guild);
    await this.humanDelay(page);

    await page.waitForSelector("table.TableContent", { timeout: 120000 });
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

      const statePath = "rubinot-state.json";
      try {
        await context.storageState({ path: statePath });
      } catch (error) {
        log(`⚠️ Não foi possível salvar estado: ${error}`);
      }

      return rows.map((raw) => this.parseRow(raw, world, guild));
    } finally {
      await page.close();
    }
  }

  async fetch(
    { world, guild }: FetchDeathsParams,
    options: FetchDeathsOptions = {}
  ): Promise<DeathEvent[]> {
    const { maxRetries = 5, retryDelayMs = 15000 } = options;

    const browser = await chromium.launch({
      headless: true,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-web-security",
        "--disable-features=IsolateOrigins,site-per-process",
        "--disable-site-isolation-trials",
      ],
    });

    const fs = await import("node:fs/promises");
    let hasStorageState = false;
    const statePath = "rubinot-state.json";

    try {
      await fs.access(statePath);
      hasStorageState = true;
      log("📂 Usando sessão salva do Rubinot");
    } catch {
      log("📂 Nenhuma sessão salva, iniciando nova");
    }

    // Prepara opções de proxy - NORMALIZA o formato
    const proxyServer = config.scraper.proxyServer.trim();
    const normalizedProxyUrl = proxyServer
      ? this.normalizeProxyUrl(proxyServer)
      : undefined;
    const proxyConfig = normalizedProxyUrl
      ? { server: normalizedProxyUrl }
      : undefined;

    if (proxyConfig) {
      // Esconde senha no log (agora já está no formato http://)
      const maskedProxy = proxyConfig.server.replace(/:[^:@]+@/, ":****@");
      log(`🌐 Usando proxy: ${maskedProxy}`);
    } else {
      log("🌐 Rodando sem proxy");
    }

    // Constrói contextOptions sem proxy primeiro
    const contextOptionsBase = {
      userAgent: this.getRandomUserAgent(),
      viewport: { width: 1920, height: 1080 },
      locale: "pt-BR",
      timezoneId: "America/Sao_Paulo",
      geolocation: { latitude: -23.5509, longitude: -46.6333 },
      permissions: ["geolocation"],
      extraHTTPHeaders: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept-Encoding": "gzip, deflate, br",
        DNT: "1",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
    };

    // Adiciona proxy apenas se configurado
    const contextOptions = proxyConfig
      ? { ...contextOptionsBase, proxy: proxyConfig }
      : contextOptionsBase;

    let context = hasStorageState
      ? await browser.newContext({ ...contextOptions, storageState: statePath })
      : await browser.newContext(contextOptions);

    try {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          log(`🔄 Tentativa ${attempt}/${maxRetries}...`);

          const deaths = await this.doFetch(context, world, guild);

          try {
            await context.storageState({ path: statePath });
            log("💾 Estado da sessão salvo/atualizado");
          } catch (error) {
            log(`⚠️ Não foi possível salvar estado: ${error}`);
          }

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

          const baseDelay = retryDelayMs * Math.pow(2, attempt - 1);
          const jitter = Math.random() * 0.3 * baseDelay;
          const delay = baseDelay + jitter;

          log(
            `⏳ Aguardando ${Math.round(
              delay / 1000
            )}s antes da próxima tentativa...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));

          if (isCloudflareError) {
            log("🧹 Limpando cookies e recriando contexto...");

            try {
              await context.clearCookies();
              log("✅ Cookies limpos");
            } catch (clearError) {
              log(`⚠️ Erro ao limpar cookies: ${clearError}`);
            }

            await context.close();

            try {
              await fs.unlink(statePath);
              log("🗑️ Storage state deletado");
              hasStorageState = false;
            } catch (unlinkError) {
              // Ignora se não existir
            }

            context = await browser.newContext(contextOptions);
            log("🆕 Novo contexto criado");
          }
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
