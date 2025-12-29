import { chromium, type Page } from 'playwright'
import crypto from 'node:crypto'
import type { DeathEvent } from '../../domain/entities/DeathEvent.js'

interface FetchDeathsParams {
  world: string
  guild: string
}

export class RubinotDeathScraper {
  private async submitForm(page: Page, world: string, guild: string) {
    // Passo 1: Navega para a página
    await page.goto('https://rubinot.com.br/?subtopic=latestdeaths', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    })

    // Passo 2: Seleciona o World e faz o primeiro submit
    await page.waitForSelector('select[name="world"]', {
      state: 'visible',
      timeout: 60000
    })
    await page.selectOption('select[name="world"]', world)
    
    // Primeiro submit
    await page.click('input.BigButtonText[type="submit"]')
    await page.waitForLoadState('domcontentloaded')

    // Passo 3: Agora seleciona a Guild e faz o segundo submit
    await page.waitForSelector('select[name="guild"]', {
      state: 'visible',
      timeout: 60000
    })
    await page.selectOption('select[name="guild"]', guild)

    // Espera a tabela de deaths aparecer
    await page.waitForSelector('table.TableContent', { timeout: 60000 })
  }

  async fetch({ world, guild }: FetchDeathsParams): Promise<DeathEvent[]> {
    const browser = await chromium.launch({ headless: false })
  
    const context = await browser.newContext({
      storageState: 'rubinot-state.json'
    })
  
    const page = await context.newPage()
  
    try {
      await this.submitForm(page, world, guild)
  
      const rows = await page.$$eval('table.TableContent tr', trs =>
        trs
          .map(tr => tr.textContent?.trim() ?? '')
          .filter(text => text.includes(' died at level '))
      )
  
      return rows.map(raw => this.parseRow(raw, world, guild))
    } finally {
      // fecha UMA única vez, SEM exceção
      await browser.close()
    }
  }
  

  private parseRow(rawText: string, world: string, guild: string): DeathEvent {
    // Normaliza espaços e quebras de linha
    const normalized = rawText.replace(/\s+/g, ' ').trim()
  
    // Formato: "280. 9.12.2025, 23:33:02 Ed Foda died at level 989 by freakish lost soul."
    // Dia e hora podem ter 1 ou 2 dígitos
    const match = normalized.match(
      /(\d{1,2}\.\d{1,2}\.\d{4},\s*\d{1,2}:\d{2}:\d{2})\s+(.+?)\s+died at level\s+(\d+)/
    )
  
    if (!match) {
      throw new Error(`Formato inesperado: ${normalized}`)
    }
  
    const dateStr = match[1]!
    const playerName = match[2]!
    const level = Number(match[3]!)
  
    // Converte "9.12.2025, 23:33:02" para Date
    const [datePart, timePart] = dateStr.split(', ')
    const [day, month, year] = datePart!.split('.')
    
    // Garante 2 dígitos no dia, mês e hora
    const paddedDay = day!.padStart(2, '0')
    const paddedMonth = month!.padStart(2, '0')
    const normalizedTime = timePart!.replace(/^(\d):/, '0$1:')
    
    const isoDate = `${year}-${paddedMonth}-${paddedDay}T${normalizedTime}`
    const occurredAt = new Date(isoDate)
  
    const hash = crypto
      .createHash('sha1')
      .update(`${world}|${guild}|${rawText}`)
      .digest('hex')
  
    return {
      world,
      guild,
      playerName,
      level,
      occurredAt,
      rawText,
      hash
    }
  }
}