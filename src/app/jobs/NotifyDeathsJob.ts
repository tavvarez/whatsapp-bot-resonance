import type { DeathRepository } from '../../domain/repositories/DeathRepository.js'
import type { MessageSender } from '../../domain/services/MessageSender.js'
import { DeathMessageFormatter } from '../../domain/services/DeathMessageFormatter.js'
import { config } from '../../config/index.js'
import { log } from '../../shared/utils/logger.js'

export class NotifyDeathsJob {
  constructor(
    private readonly deathRepository: DeathRepository,
    private readonly messageSender: MessageSender
  ) {}

  async execute(to: string): Promise<void> {
    const deaths = await this.deathRepository.findUnnotified(config.jobs.notifyLimit)

    if (deaths.length === 0) {
      log('📭 Nenhuma morte pendente para notificar')
      return
    }

    log(`📨 Notificando ${deaths.length} mortes...`)

    const batchSize = config.jobs.notifyBatchSize
    const notifiedIds: string[] = []

    for (let i = 0; i < deaths.length; i += batchSize) {
      const batch = deaths.slice(i, i + batchSize)
      
      const message = DeathMessageFormatter.formatBatch(batch)
      
      await this.messageSender.sendMessage(to, { text: message })

      // Coleta IDs para marcar como notificado
      for (const death of batch) {
        if (death.id) notifiedIds.push(death.id)
      }

      // Delay entre mensagens para não parecer spam
      if (i + batchSize < deaths.length) {
        await new Promise(resolve => setTimeout(resolve, config.jobs.notifyBatchDelayMs))
      }
    }

    if (notifiedIds.length > 0) {
      await this.deathRepository.markAsNotified(notifiedIds)
    }

    log(`✅ ${notifiedIds.length} mortes notificadas`)
  }
}