import type { DeathRepository } from '../../domain/repositories/DeathRepository.js'
import { BaileysClient } from '../../infra/whatsapp/BaileysClient.js'
import { DeathMessageFormatter } from '../../domain/services/DeathMessageFormatter.js'

export class NotifyDeathsJob {
  constructor(
    private readonly deathRepository: DeathRepository,
    private readonly whatsapp: BaileysClient
  ) {}

  async execute(to: string, limit = 10): Promise<void> {
    const deaths = await this.deathRepository.findUnnotified(limit)

    if (deaths.length === 0) return

    const notifiedIds: string[] = []

    for (const death of deaths) {
      const message = DeathMessageFormatter.format(death)

      await this.whatsapp.sendMessage(to, { text: message })

      if (death.id) notifiedIds.push(death.id)
    }

    if (notifiedIds.length > 0) {
      await this.deathRepository.markAsNotified(notifiedIds)
    }
  }
}