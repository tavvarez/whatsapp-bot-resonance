import { chromium } from 'playwright-extra'
import stealth from 'puppeteer-extra-plugin-stealth'
import type { Page, BrowserContext } from 'playwright'
import type { GuildScraper, GuildMember, FetchMembersOptions } from '../../domain/scrapers/GuildScraper.js'
import { log } from '../../shared/utils/logger.js'
import { CloudflareBlockedError, ScraperError } from '../../shared/errors/index.js'
import { config } from '../../config/index.js'

chromium.use(stealth())

export class RubinotGuildScraper implements GuildScraper {
  private readonly baseUrl = 'https://rubinot.com.br'

  /**
   * Converte o formato de proxy do IPRoyal (user:pass:host:port) 
   * para o formato do Playwright (http://user:pass@host:port)
   */
  private normalizeProxyUrl(proxyString: string): string {
    // Se já está no formato http://, retorna como está
    if (proxyString.startsWith('http://') || proxyString.startsWith('https://')) {
      return proxyString
    }

    // Formato IPRoyal: user:pass:host:port
    const parts = proxyString.split(':')
    
    if (parts.length === 4) {
      const [user, pass, host, port] = parts
      return `http://${user}:${pass}@${host}:${port}`
    }

    // Se não conseguir parsear, retorna como está
    log(`⚠️ Formato de proxy não reconhecido: ${proxyString}`)
    return proxyString
  }  

  private async humanDelay(page: Page, min = 300, max = 800): Promise<void> {
    const delay = Math.random() * (max - min) + min
    await page.waitForTimeout(delay)
  }

  private async detectCloudflare(page: Page): Promise<boolean> {
    try {
      await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {})
      
      const indicators = [
        'cf-browser-verification',
        'cf_chl_opt',
        'challenge-running',
        'Just a moment...',
        'Verify you are human'
      ]

      const content = await page.content()
      const title = await page.title()

      return indicators.some(i => content.includes(i) || title.includes(i))
    } catch {
      return true
    }
  }

  private async waitForCloudflare(page: Page, timeoutMs = 30000): Promise<boolean> {
    const start = Date.now()

    while (Date.now() - start < timeoutMs) {
      if (!(await this.detectCloudflare(page))) {
        return true
      }
      log('⏳ Aguardando Cloudflare (guild)...')
      await page.waitForTimeout(2000)
    }

    return false
  }

  private async doFetch(context: BrowserContext, guildName: string): Promise<GuildMember[]> {
    const url = `${this.baseUrl}/?subtopic=guilds&page=view&GuildName=${encodeURIComponent(guildName)}`
    const page = await context.newPage()

    try {
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 60000
      })

      await this.humanDelay(page, 1000, 2000)

      if (await this.detectCloudflare(page)) {
        log('🛡️ Cloudflare detectado (guild)...')
        const passed = await this.waitForCloudflare(page)
        if (!passed) {
          throw new CloudflareBlockedError()
        }
      }

      await this.humanDelay(page)

      await page.waitForSelector('table.TableContent', { timeout: 30000 })

      const members = await page.$$eval('table.TableContent tr', (rows) => {
        const result: Array<{ playerName: string; level: number; vocation: string; isOnline: boolean }> = []

        for (const row of rows) {
          const cells = row.querySelectorAll('td')
          if (cells.length < 6) continue

          if (row.classList.contains('LabelH')) continue

          const nameCell = cells[1]
          const nameLink = nameCell?.querySelector('a')
          if (!nameLink) continue

          const playerName = nameLink.textContent?.trim() ?? ''
          if (!playerName) continue

          const vocation = cells[2]?.textContent?.trim() ?? ''

          const levelText = cells[3]?.textContent?.trim() ?? '0'
          const level = parseInt(levelText, 10)
          if (isNaN(level)) continue

          const statusCell = cells[5]
          const isOnline = statusCell?.textContent?.toLowerCase().includes('online') ?? false

          result.push({ playerName, level, vocation, isOnline })
        }

        return result
      })

      return members
    } finally {
      await page.close()
    }
  }

  async fetchMembers(guildName: string, options: FetchMembersOptions = {}): Promise<GuildMember[]> {
    const { maxRetries = 5, retryDelayMs = 10000 } = options;

    log(`🔍 Buscando membros da guild: ${guildName}`);

    const browser = await chromium.launch({
      headless: true,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });

    // Prepara opções de proxy
    const proxyServer = config.scraper.proxyServer.trim();
    const normalizedProxyUrl = proxyServer
      ? this.normalizeProxyUrl(proxyServer)
      : undefined;
    const proxyConfig = normalizedProxyUrl
      ? { server: normalizedProxyUrl }
      : undefined;

    if (proxyConfig) {
      const maskedProxy = proxyConfig.server.replace(/:[^:@]+@/, ":****@");
      log(`🌐 Usando proxy (guild): ${maskedProxy}`);
    } else {
      log("🌐 Rodando sem proxy (guild)");
    }

    // Constrói contextOptions base
    const contextOptionsBase = {
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1920, height: 1080 },
      locale: "pt-BR",
      timezoneId: "America/Sao_Paulo",
    };

    // Adiciona proxy apenas se configurado
    const contextOptions = proxyConfig
      ? { ...contextOptionsBase, proxy: proxyConfig }
      : contextOptionsBase;

    const context = await browser.newContext(contextOptions);

    try {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          log(`🔄 Tentativa ${attempt}/${maxRetries} (guild)...`);

          const members = await this.doFetch(context, guildName);

          log(`✅ Sucesso! ${members.length} membros encontrados.`);
          return members;
        } catch (error) {
          const isCloudflareError = error instanceof CloudflareBlockedError;

          console.warn(
            `⚠️ Tentativa ${attempt} falhou (guild):`,
            isCloudflareError ? "Cloudflare bloqueou" : error
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
          log(`⏳ Aguardando ${delay / 1000}s antes da próxima tentativa...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      throw new ScraperError("Todas as tentativas falharam");
    } finally {
      await browser.close();
    }
  }
}
