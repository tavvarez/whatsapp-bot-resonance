import type { DeathEvent } from '../entities/DeathEvent.js'

export class DeathMessageFormatter {
  static format(event: DeathEvent): string {
    // Extrai "by monster" do rawText
    const byMatch = event.rawText.match(/died at level \d+ (.+)/)
    const deathCause = byMatch?.[1]?.trim() ?? ''

    // Formata a hora da morte (não a diferença com agora)
    const time = event.occurredAt.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })

    return `${time} HUNTED DEATH ${event.rawText}`
  }
}