import type { DeathEvent } from '../entities/DeathEvent.js'

export class DeathMessageFormatter {
  /**
   * Formata uma única morte
   */
  static format(event: DeathEvent): string {
    const time = event.occurredAt.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })

    // Extrai "by monster" do rawText
    const byMatch = event.rawText.match(/died at level \d+ (.+)/)
    const deathCause = byMatch?.[1]?.trim() ?? ''

    return `*${time}* — *${event.playerName}* died at level *${event.level}* ${deathCause}`
  }

  /**
   * Formata múltiplas mortes em uma única mensagem
   */
  static formatBatch(events: DeathEvent[]): string {
    if (events.length === 0) return ''

    const header = `🔴 *HUNTED DEATHS* (${events.length})\n${'─'.repeat(12)}\n`

    const lines = events.map(event => {
      const time = event.occurredAt.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      })

      const byMatch = event.rawText.match(/died at level \d+ (.+)/)
      const deathCause = byMatch?.[1]?.trim() ?? ''

      return ` ${time} — *${event.playerName}* died at level (${event.level}) ${deathCause}`
    })

    return header + lines.join('\n')
  }

  /**
   * Formata com tempo relativo (há X minutos)
   */
  static formatWithRelativeTime(event: DeathEvent): string {
    const diffMs = Date.now() - event.occurredAt.getTime()
    const minutes = Math.floor(diffMs / 60000)

    let timeLabel: string
    if (minutes < 1) {
      timeLabel = 'agora'
    } else if (minutes < 60) {
      timeLabel = `há ${minutes}min`
    } else if (minutes < 1440) {
      timeLabel = `há ${Math.floor(minutes / 60)}h`
    } else {
      timeLabel = `há ${Math.floor(minutes / 1440)}d`
    }

    const byMatch = event.rawText.match(/died at level \d+ (.+)/)
    const deathCause = byMatch?.[1]?.trim() ?? ''

    return `[${timeLabel}] *${event.playerName}* died at level *${event.level}* ${deathCause}`
  }
}