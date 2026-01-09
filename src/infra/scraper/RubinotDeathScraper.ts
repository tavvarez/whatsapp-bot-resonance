import crypto from "node:crypto";
import type { Page, BrowserContext } from "playwright";
import type { DeathEvent } from "../../domain/entities/DeathEvent.js";
import type {
  DeathScraper,
  FetchDeathsParams,
  FetchDeathsOptions,
} from "../../domain/scrapers/DeathScraper.js";
import { logger } from "../../shared/utils/logger.js";
import {
  CloudflareBlockedError,
  ParseError,
  ScraperError,
} from "../../shared/errors/index.js";
import { config } from "../../config/index.js";
import { BaseScraper } from "./BaseScraper.js";

export class RubinotDeathScraper extends BaseScraper implements DeathScraper {

  private async submitForm(
    page: Page,
    world: string,
    guild: string
  ): Promise<void> {
    // Passo 1: Navega para a página
    await page.goto("https://rubinot.com.br/?subtopic=latestdeaths", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    // Verifica Cloudflare e espera passar
    if (await this.detectCloudflare(page)) {
      if (process.env.SCRAPER_BOOTSTRAP === "true") {
        logger.warn("🧠 Cloudflare detectado. Resolva manualmente no navegador.");
        await page.waitForTimeout(120000); // 2 minutos pra você resolver
      } else {
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
      logger.debug("💾 Sessão salva com sucesso");
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
    const isBootstrap = process.env.SCRAPER_BOOTSTRAP === "true";
    
    const browser = await this.createBrowser(!isBootstrap);

    // Verifica se o arquivo de estado existe
    const fs = await import("node:fs/promises");
    let hasStorageState = false;

    try {
      await fs.access("rubinot-state.json");
      hasStorageState = true;
      logger.info("📂 Usando sessão salva do Rubinot");
    } catch {
      logger.info("📂 Nenhuma sessão salva, iniciando nova");
    }

    // Cria context com geolocation e storage state (se existir)
    const contextOptions: any = {
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1920, height: 1080 },
      locale: "pt-BR",
      timezoneId: "America/Sao_Paulo",
      geolocation: { latitude: -23.5505, longitude: -46.6333 },
      permissions: ["geolocation"],
    };

    // Adiciona proxy se configurado
    const proxyServer = config.scraper.proxyServer?.trim();
    if (proxyServer) {
      const proxyConfig = this.createProxyConfig(proxyServer);
      if (proxyConfig) {
        contextOptions.proxy = proxyConfig;
        const maskedUser = proxyConfig.username.slice(0, 4) + "****";
        logger.info(
          `🌐 Usando proxy: ${proxyConfig.server.replace(/^https?:\/\//, "")} (user: ${maskedUser})`
        );
      }
    } else {
      logger.info("🌐 Rodando sem proxy");
    }

    // Adiciona storage state se existir
    if (hasStorageState) {
      contextOptions.storageState = "rubinot-state.json";
    }

    const context = await browser.newContext(contextOptions);

    return await this.executeFetchWithRetry(
      context,
      world,
      guild,
      maxRetries,
      retryDelayMs,
      browser,
      isBootstrap
    );
  }

  private async executeFetchWithRetry(
    context: BrowserContext,
    world: string,
    guild: string,
    maxRetries: number,
    retryDelayMs: number,
    browser: any,
    isBootstrap: boolean
  ): Promise<DeathEvent[]> {

    try {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          logger.info(`🔄 Tentativa ${attempt}/${maxRetries}...`);

          const deaths = await this.doFetch(context, world, guild);

          logger.success(`${deaths.length} mortes encontradas.`);
          return deaths;
        } catch (error) {
          const isCloudflareError = error instanceof CloudflareBlockedError;

          logger.warn(
            `Tentativa ${attempt} falhou: ${isCloudflareError ? "Cloudflare bloqueou" : "Erro desconhecido"}`,
            isCloudflareError ? undefined : error
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
          logger.info(`⏳ Aguardando ${delay / 1000}s antes da próxima tentativa...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      throw new ScraperError("Todas as tentativas falharam");
    } finally {
      if (!isBootstrap) {
        await browser.close();
      }
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
