import type { DeathRepository } from '../../domain/repositories/DeathRepository.js'
import type { HuntedGuildRepository } from '../../domain/repositories/HuntedGuildRepository.js'
import type { MessageSender } from '../../domain/services/MessageSender.js'
import { DeathMessageFormatter } from '../../domain/services/DeathMessageFormatter.js'
import { config } from '../../config/index.js'
import { logger } from '../../shared/utils/logger.js'

/**
 * Job V2 para notificar mortes (multi-tenancy).
 * Envia notificações de mortes para os grupos configurados de cada hunted guild.
 */
export class NotifyDeathsJobV2 {
  constructor(
    private readonly deathRepository: DeathRepository,
    private readonly huntedGuildRepository: HuntedGuildRepository,
    private readonly messageSender: MessageSender
  ) {}

  async execute(): Promise<void> {
    logger.info('📨 [JobV2] Iniciando notificação de mortes multi-tenancy...')

    // 1. Busca todas as hunted guilds ativas que querem notificações de morte
    const huntedGuilds = await this.huntedGuildRepository.listAllActive()
    const guildsToNotify = huntedGuilds.filter(hg => hg.notifyDeaths)

    if (guildsToNotify.length === 0) {
      logger.info('⚠️ Nenhuma guild configurada para notificações de morte')
      return
    }

    // 2. Agrupa por grupo do WhatsApp (várias guilds podem notificar no mesmo grupo)
    const groupedByChat = this.groupByBotGroup(guildsToNotify)

    // 3. Para cada grupo, notifica mortes pendentes
    for (const [botGroupId, guilds] of groupedByChat) {
      await this.notifyToGroup(botGroupId, guilds)
    }

    logger.info('✅ [JobV2] Notificação de mortes finalizada')
  }

  /**
   * Agrupa hunted guilds por bot_group_id.
   */
  private groupByBotGroup(guilds: any[]): Map<string, any[]> {
    const map = new Map<string, any[]>()
    for (const guild of guilds) {
      const existing = map.get(guild.botGroupId) || []
      existing.push(guild)
      map.set(guild.botGroupId, existing)
    }
    return map
  }

  /**
   * Notifica mortes pendentes para um grupo específico.
   * Como múltiplas guilds podem notificar no mesmo grupo, precisamos
   * buscar mortes de todas elas.
   */
  private async notifyToGroup(botGroupId: string, guilds: any[]): Promise<void> {
    try {
      // Busca o group_id do WhatsApp (precisaria de BotGroupRepository)
      // Por enquanto, vamos usar o botGroupId como chatId
      // TODO: Melhorar isso buscando o groupId real do banco
      const chatId = guilds[0]?.botGroupId // Temporário

      logger.info(`📱 Notificando grupo: ${chatId}`)

      // Busca mortes não notificadas (de todas as guilds)
      const deaths = await this.deathRepository.findUnnotified(config.jobs.notifyLimit)

      if (deaths.length === 0) {
        logger.debug(`📭 Nenhuma morte pendente para ${chatId}`)
        return
      }

      logger.info(`📨 Enviando ${deaths.length} mortes para ${chatId}...`)

      // Envia em batches
      const batchSize = config.jobs.notifyBatchSize
      const notifiedIds: string[] = []

      for (let i = 0; i < deaths.length; i += batchSize) {
        const batch = deaths.slice(i, i + batchSize)

        const message = DeathMessageFormatter.formatBatch(batch)

        // IMPORTANTE: Aqui precisamos do groupId real do WhatsApp, não o UUID do banco
        // Vamos usar o primeiro guild.botGroupId temporariamente
        // TODO: Buscar o groupId correto do BotGroup
        await this.messageSender.sendMessage(chatId, { text: message })

        // Coleta IDs para marcar como notificado
        for (const death of batch) {
          if (death.id) notifiedIds.push(death.id)
        }

        // Delay entre mensagens
        if (i + batchSize < deaths.length) {
          await new Promise(resolve => setTimeout(resolve, config.jobs.notifyBatchDelayMs))
        }
      }

      if (notifiedIds.length > 0) {
        await this.deathRepository.markAsNotified(notifiedIds)
      }

      logger.info(`✅ ${notifiedIds.length} mortes notificadas para ${chatId}`)
    } catch (error) {
      logger.error(`❌ Erro ao notificar grupo ${botGroupId}:`, error)
    }
  }
}
