import * as cheerio from 'cheerio'
import crypto from 'crypto'
import type { DeathEvent } from '../../domain/entities/DeathEvent.js'

export class RubinotDeathParser {
  parse(html: string, world: string, guild: string): DeathEvent[] {
    const $ = cheerio.load(html)
    const events: DeathEvent[] = []

    $('table tr').each((_, row) => {
      const text = $(row).text().trim()
      if (!text.includes('died at level')) return

      const match = text.match(
        /^(\d{2}\.\d{2}\.\d{4}), (\d{2}:\d{2}:\d{2}) (.+) died at level (\d+)/
      )

      if (!match) return

      const [, date, time, player, level] = match
      if (!date || !time || !player || !level) return

      const occurredAt = new Date(
        date.split('.').reverse().join('-') + 'T' + time + 'Z'
      )

      const hash = crypto
        .createHash('sha256')
        .update(`${world}|${guild}|${player}|${occurredAt.toISOString()}`)
        .digest('hex')

      events.push({
        world,
        guild,
        playerName: player,
        level: Number(level),
        occurredAt,
        rawText: text,
        hash
      })
    })

    return events
  }
}
