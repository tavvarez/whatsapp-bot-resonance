import type { BrowserContext, Page } from "playwright";
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
import { config } from "../../config/index.js";
import { BaseScraper } from "./BaseScraper.js";

export class RubinotGuildScraper extends BaseScraper implements GuildScraper {

  private async doFetch(
    context: BrowserContext,
    guildName: string
  ): Promise<GuildMember[]> {
    const url = `${
      this.baseUrl
    }/?subtopic=guilds&page=view&GuildName=${encodeURIComponent(guildName)}`;
    const page = await context.newPage();

    try {
      await page.goto(url, {
        waitUntil: "networkidle",
        timeout: 60000,
      });

      await this.humanDelay(page, 1000, 2000);

      if (await this.detectCloudflare(page)) {
        logger.warn("🛡️ Cloudflare detectado (guild)...");
        const passed = await this.waitForCloudflare(page);
        if (!passed) {
          throw new CloudflareBlockedError();
        }
      }

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

      return members;
    } finally {
      await page.close();
    }
  }

  async fetchMembers(
    guildName: string,
    options: FetchMembersOptions = {}
  ): Promise<GuildMember[]> {
    const { maxRetries = 5, retryDelayMs = 10000 } = options;

    logger.info(`🔍 Buscando membros da guild: ${guildName}`);

    const browser = await this.createBrowser(true);
    const context = await this.createContext(browser);

    try {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          logger.info(`🔄 Tentativa ${attempt}/${maxRetries} (guild)...`);

          const members = await this.doFetch(context, guildName);

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
    } finally {
      await browser.close();
    }
  }
}
