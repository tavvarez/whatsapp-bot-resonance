import { chromium } from 'playwright-extra'
import stealth from 'puppeteer-extra-plugin-stealth'
import type { Page } from 'playwright'
import type { GuildScraper, GuildMember } from '../../domain/scrapers/GuildScraper.js'
import { log } from '../../shared/utils/logger.js'
import { CloudflareBlockedError, ScraperError } from '../../shared/errors/index.js'

chromium.use(stealth())

export class RubinotGuildScraper implements GuildScraper {
  private readonly baseUrl = 'https://rubinot.com.br'

  private async humanDelay(page: Page, min = 300, max = 800): Promise<void> {
    const delay = Math.random() * (max - min) + min
    await page.waitForTimeout(delay)
  }

  private async detectCloudflare(page: Page): Promise<boolean> {
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

  async fetchMembers(guildName: string): Promise<GuildMember[]> {
    const url = `${this.baseUrl}/?subtopic=guilds&page=view&GuildName=${encodeURIComponent(guildName)}`
    
    log(`🔍 Buscando membros da guild: ${guildName}`)

    const browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    })

    // Verifica se tem sessão salva
    const fs = await import('node:fs/promises')
    let hasStorageState = false

    try {
      await fs.access('rubinot-state.json')
      hasStorageState = true
    } catch {
      // Sem sessão salva
    }

    const contextOptions = {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'pt-BR',
      timezoneId: 'America/Sao_Paulo'
    }

    const context = hasStorageState
      ? await browser.newContext({ ...contextOptions, storageState: 'rubinot-state.json' })
      : await browser.newContext(contextOptions)

    const page = await context.newPage()

    try {
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      })

      if (await this.detectCloudflare(page)) {
        log('🛡️ Cloudflare detectado (guild)...')
        const passed = await this.waitForCloudflare(page)
        if (!passed) {
          throw new CloudflareBlockedError()
        }
      }

      await this.humanDelay(page)

      // Aguarda a tabela de membros
      await page.waitForSelector('table.TableContent', { timeout: 30000 })

      // Extrai os membros da tabela
      const members = await page.$$eval('table.TableContent tr', (rows) => {
        const result: Array<{ playerName: string; level: number; vocation: string; isOnline: boolean }> = []

        for (const row of rows) {
          const cells = row.querySelectorAll('td')
          if (cells.length < 6) continue

          // Ignora header
          if (row.classList.contains('LabelH')) continue

          // Coluna 1: Name (com link)
          const nameCell = cells[1]
          const nameLink = nameCell?.querySelector('a')
          if (!nameLink) continue

          const playerName = nameLink.textContent?.trim() ?? ''
          if (!playerName) continue

          // Coluna 2: Vocation
          const vocation = cells[2]?.textContent?.trim() ?? ''

          // Coluna 3: Level
          const levelText = cells[3]?.textContent?.trim() ?? '0'
          const level = parseInt(levelText, 10)
          if (isNaN(level)) continue

          // Coluna 5: Status (Online/Offline)
          const statusCell = cells[5]
          const isOnline = statusCell?.textContent?.toLowerCase().includes('online') ?? false

          result.push({ playerName, level, vocation, isOnline })
        }

        return result
      })

      // Salva estado para reutilizar cookies
      await context.storageState({ path: 'rubinot-state.json' })

      log(`✅ ${members.length} membros encontrados na guild ${guildName}`)

      return members
    } catch (error) {
      if (error instanceof CloudflareBlockedError) {
        throw error
      }
      throw new ScraperError('Erro ao buscar membros da guild', error)
    } finally {
      await browser.close()
    }
  }
}

