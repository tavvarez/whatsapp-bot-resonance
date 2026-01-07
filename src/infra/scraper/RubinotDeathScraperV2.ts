import crypto from "node:crypto";
import type { Page } from "playwright";
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
import { BaseScraper } from "./BaseScraper.js";
import { browserPool } from "./BrowserPool.js";

/**
 * Scraper de mortes do Rubinot usando BrowserPool.
 * Mantém o browser aberto para reutilizar sessão e evitar Cloudflare.
 * 
 * Benefícios:
 * - Não precisa passar pelo Cloudflare toda vez
 * - Mais rápido (só dá F5 na página)
 * - Cookies e sessão persistentes
 * - Browser renovado automaticamente a cada 24h
 */
export class RubinotDeathScraperV2 extends BaseScraper implements DeathScraper {
  private lastUrl: string | null = null;

  /**
   * Inicializa o browser pool (deve ser chamado no bootstrap)
   */
  async initialize(): Promise<void> {
    await browserPool.initialize();
  }

  /**
   * Encerra o browser pool (deve ser chamado no shutdown)
   */
  async shutdown(): Promise<void> {
    await browserPool.shutdown();
  }

  /**
   * Navega para a página de deaths ou atualiza se já estiver lá
   */
  private async navigateOrRefresh(
    page: Page,
    world: string,
    guild: string
  ): Promise<void> {
    const targetUrl = `https://rubinot.com.br/?subtopic=latestdeaths&world=${encodeURIComponent(world)}&guild=${encodeURIComponent(guild)}`;

    // Se já está na URL correta, só atualiza
    if (page.url() === targetUrl) {
      logger.debug("♻️ Atualizando página (F5)");
      await page.reload({ waitUntil: "domcontentloaded" });
      await this.humanDelay(page, 1000, 2000);
      return;
    }

    // Senão, navega para a URL
    logger.debug("🌐 Navegando para página de deaths");
    await page.goto(targetUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await this.humanDelay(page, 1000, 2000);

    // Verifica Cloudflare
    if (await this.detectCloudflare(page)) {
      if (process.env.SCRAPER_BOOTSTRAP === "true") {
        logger.warn("🧠 Cloudflare detectado. Resolva manualmente no navegador.");
        await page.waitForTimeout(120000); // 2 minutos
      } else {
        throw new CloudflareBlockedError();
      }
    }

    this.lastUrl = targetUrl;
  }

  /**
   * Extrai as mortes da página
   */
  private async extractDeaths(
    page: Page,
    world: string,
    guild: string
  ): Promise<DeathEvent[]> {
    // Aguarda a tabela aparecer
    await page.waitForSelector("table.TableContent", { timeout: 30000 });

    // Extrai os textos das mortes
    const rows = await page.$$eval("table.TableContent tr", (trs) =>
      trs
        .map((tr) => tr.textContent?.trim() ?? "")
        .filter((text) => text.includes(" died at level "))
    );

    logger.debug(`📊 ${rows.length} mortes encontradas na página`);

    // Parse das mortes
    return rows.map((raw) => this.parseRow(raw, world, guild));
  }

  /**
   * Busca mortes usando o browser pool
   */
  async fetch(
    { world, guild }: FetchDeathsParams,
    options: FetchDeathsOptions = {}
  ): Promise<DeathEvent[]> {
    const { maxRetries = 5, retryDelayMs = 10000 } = options;

    logger.info(`🔎 Buscando mortes... world=${world}, guild=${guild}`);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`🔄 Tentativa ${attempt}/${maxRetries}...`);

        // Usa uma página do pool
        const deaths = await browserPool.withPage(
          async (page) => {
            // Navega ou atualiza a página
            await this.navigateOrRefresh(page, world, guild);

            // Extrai as mortes
            return await this.extractDeaths(page, world, guild);
          },
          true // Salva sessão após sucesso
        );

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
  }

  /**
   * Parse de uma linha de morte
   */
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

    // Hash baseado em dados imutáveis
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

