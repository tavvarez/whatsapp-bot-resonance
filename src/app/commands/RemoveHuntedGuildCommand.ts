import type { Command, CommandContext } from '../../domain/commands/Command.js'
import type { MessageSender } from '../../domain/services/MessageSender.js'
import type { HuntedGuildRepository } from '../../domain/repositories/HuntedGuildRepository.js'
import type { BotGroupRepository } from '../../domain/repositories/BotGroupRepository.js'
import { normalizeText } from '../../shared/utils/normalizeText.js'
import { logger } from '../../shared/utils/logger.js'

/**
 * Comando para remover (soft delete) uma guild da lista de monitoramento.
 * 
 * Uso: @bot hunted remove <guild_name>
 * Exemplo: @bot hunted remove Genesis
 */
export class RemoveHuntedGuildCommand implements Command {
  readonly name = 'hunted-remove'
  readonly description = 'Remove uma guild da lista de monitoramento'
  readonly aliases = ['remove-hunted', 'hunted remove', 'hunted del']
  readonly permission = 'admin' as const
  readonly scope = 'admin_group' as const

  constructor(
    private readonly huntedGuildRepository: HuntedGuildRepository,
    private readonly botGroupRepository: BotGroupRepository,
    private readonly messageSender: MessageSender
  ) {}

  async execute({ text, chatId, sender }: CommandContext): Promise<void> {
    const guildName = text.trim()

    if (!guildName) {
      await this.messageSender.sendMessage(chatId, {
        text: [
          '❌ *Formato inválido*',
          '',
          'Uso: @bot hunted remove <guild_name>',
          '',
          'Exemplo: @bot hunted remove Genesis',
          '',
          '💡 Para ver guilds monitoradas: @bot hunted list'
        ].join('\n')
      })
      return
    }

    logger.info(`🗑️ Admin ${sender} tentando remover hunted guild: ${guildName}`)

    // 1. Busca o grupo atual
    const group = await this.botGroupRepository.findByGroupId(chatId)
    if (!group || !group.tenantId) {
      await this.messageSender.sendMessage(chatId, {
        text: '❌ Este grupo não está configurado corretamente no banco.'
      })
      return
    }

    // 2. Busca todas as guilds ativas do tenant
    const huntedGuilds = await this.huntedGuildRepository.listActiveByTenant(group.tenantId)

    // 3. Encontra a guild pelo nome (case-insensitive)
    const normalized = normalizeText(guildName)
    const toRemove = huntedGuilds.find(hg => hg.guildNameNormalized === normalized)

    if (!toRemove) {
      await this.messageSender.sendMessage(chatId, {
        text: [
          `❌ Guild *${guildName}* não encontrada na lista de monitoramento.`,
          '',
          'Use: @bot hunted list para ver as guilds monitoradas'
        ].join('\n')
      })
      return
    }

    // 4. Faz soft delete
    await this.huntedGuildRepository.softDelete(toRemove.id!, sender)

    await this.messageSender.sendMessage(chatId, {
      text: [
        `✅ *Guild removida da hunted list!*`,
        '',
        `⚔️ Guild: *${toRemove.guildName}*`,
        '',
        `O bot não monitorará mais esta guild.`,
        '',
        '💡 Para reativar, use: @bot hunted add'
      ].join('\n')
    })

    logger.info(`✅ Hunted guild removida (soft delete): ${toRemove.guildName} (ID: ${toRemove.id})`)
  }
}
