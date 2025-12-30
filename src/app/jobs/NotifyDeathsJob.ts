import type { DeathRepository } from '../../domain/repositories/DeathRepository.js'
import type { BaileysClient } from '../../infra/whatsapp/BaileysClient.js'
import { DeathMessageFormatter } from '../../domain/services/DeathMessageFormatter.js'
import { log } from '../../shared/utils/logger.js'

export class NotifyDeathsJob {
  constructor(
    private readonly deathRepository: DeathRepository,
    private readonly whatsapp: BaileysClient
  ) {}

  async execute(to: string, limit = 50): Promise<void> {
    const deaths = await this.deathRepository.findUnnotified(limit)

    if (deaths.length === 0) {
      log('📭 Nenhuma morte pendente para notificar')
      return
    }

    log(`📨 Notificando ${deaths.length} mortes...`)

    // Agrupa em batches de 10 para não fazer mensagens muito longas
    const batchSize = 10
    const notifiedIds: string[] = []

    for (let i = 0; i < deaths.length; i += batchSize) {
      const batch = deaths.slice(i, i + batchSize)
      
      const message = DeathMessageFormatter.formatBatch(batch)
      
      await this.whatsapp.sendMessage(to, { text: message })

      // Coleta IDs para marcar como notificado
      for (const death of batch) {
        if (death.id) notifiedIds.push(death.id)
      }

      // Delay entre mensagens para não parecer spam
      if (i + batchSize < deaths.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    if (notifiedIds.length > 0) {
      await this.deathRepository.markAsNotified(notifiedIds)
    }

    log(`✅ ${notifiedIds.length} mortes notificadas`)
  }
}