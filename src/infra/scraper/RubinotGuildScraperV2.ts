import type { Page } from "playwright";
import type {
  GuildScraper,
  GuildMember,
  FetchMembersOptions,
} from "../../domain/scrapers/GuildScraper.js";
import { logger } from "../../shared/utils/logger.js";
import {
  CloudflareBlockedError,
  ScraperError,
} from "../../shared/errors/index.js";
import { BaseScraper } from "./BaseScraper.js";
import { browserPool } from "./BrowserPool.js";

/**
 * Scraper de guild do Rubinot usando BrowserPool.
 * Mantém o browser aberto para reutilizar sessão e evitar Cloudflare.
 */
export class RubinotGuildScraperV2 extends BaseScraper implements GuildScraper {
  private lastGuildUrl: string | null = null;

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
   * Navega para a página da guild ou atualiza se já estiver lá
   */
  private async navigateOrRefresh(page: Page, guildName: string): Promise<void> {
    const targetUrl = `${this.baseUrl}/?subtopic=guilds&page=view&GuildName=${encodeURIComponent(guildName)}`;

    // Se já está na URL correta, só atualiza
    if (page.url() === targetUrl) {
      logger.debug("♻️ Atualizando página da guild (F5)");
      await page.reload({ waitUntil: "networkidle" });
      await this.humanDelay(page, 1000, 2000);
      return;
    }

    // Senão, navega para a URL
    logger.debug("🌐 Navegando para página da guild");
    await page.goto(targetUrl, {
      waitUntil: "networkidle",
      timeout: 60000,
    });

    await this.humanDelay(page, 1000, 2000);

    // Verifica Cloudflare
    if (await this.detectCloudflare(page)) {
      logger.warn("🛡️ Cloudflare detectado (guild)...");
      const passed = await this.waitForCloudflare(page);
      if (!passed) {
        throw new CloudflareBlockedError();
      }
    }

    this.lastGuildUrl = targetUrl;
  }

  /**
   * Extrai membros da guild da página
   */
  private async extractMembers(page: Page): Promise<GuildMember[]> {
    await this.humanDelay(page);

    await page.waitForSelector("table.TableContent", { timeout: 30000 });

    const members = await page.$$eval("table.TableContent tr", (rows) => {
      const result: Array<{
        playerName: string;
        level: number;
        vocation: string;
        isOnline: boolean;
      }> = [];

      for (const row of rows) {
        const cells = row.querySelectorAll("td");
        if (cells.length < 6) continue;

        if (row.classList.contains("LabelH")) continue;

        const nameCell = cells[1];
        const nameLink = nameCell?.querySelector("a");
        if (!nameLink) continue;

        const playerName = nameLink.textContent?.trim() ?? "";
        if (!playerName) continue;

        const vocation = cells[2]?.textContent?.trim() ?? "";

        const levelText = cells[3]?.textContent?.trim() ?? "0";
        const level = parseInt(levelText, 10);
        if (isNaN(level)) continue;

        const statusCell = cells[5];
        const isOnline =
          statusCell?.textContent?.toLowerCase().includes("online") ?? false;

        result.push({ playerName, level, vocation, isOnline });
      }

      return result;
    });

    logger.debug(`📊 ${members.length} membros encontrados na página`);
    return members;
  }

  /**
   * Busca membros da guild usando o browser pool
   */
  async fetchMembers(
    guildName: string,
    options: FetchMembersOptions = {}
  ): Promise<GuildMember[]> {
    const { maxRetries = 5, retryDelayMs = 10000 } = options;

    logger.info(`🔍 Buscando membros da guild: ${guildName}`);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`🔄 Tentativa ${attempt}/${maxRetries} (guild)...`);

        // Usa uma página do pool
        const members = await browserPool.withPage(
          async (page) => {
            // Navega ou atualiza a página
            await this.navigateOrRefresh(page, guildName);

            // Extrai os membros
            return await this.extractMembers(page);
          },
          true // Salva sessão após sucesso
        );

        logger.success(`${members.length} membros encontrados.`);
        return members;
      } catch (error) {
        const isCloudflareError = error instanceof CloudflareBlockedError;

        logger.warn(
          `Tentativa ${attempt} falhou (guild): ${isCloudflareError ? "Cloudflare bloqueou" : "Erro desconhecido"}`,
          isCloudflareError ? undefined : error
        );

        if (attempt === maxRetries) {
          if (isCloudflareError) {
            throw error;
          }
          throw new ScraperError(
            "Todas as tentativas de scraping da guild falharam",
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
}

