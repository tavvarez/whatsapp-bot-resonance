import type { Command, CommandContext } from '../../domain/commands/Command.js'
import type { MessageSender } from '../../domain/services/MessageSender.js'
import type { HuntedGuildRepository } from '../../domain/repositories/HuntedGuildRepository.js'
import type { GameWorldRepository } from '../../domain/repositories/GameWorldRepository.js'
import type { GameServerRepository } from '../../domain/repositories/GameServerRepository.js'
import type { BotGroupRepository } from '../../domain/repositories/BotGroupRepository.js'
import { logger } from '../../shared/utils/logger.js'

/**
 * Comando para listar todas as guilds sendo monitoradas.
 * 
 * Uso: @bot hunted list
 */
export class ListHuntedGuildsCommand implements Command {
  readonly name = 'hunted-list'
  readonly description = 'Lista guilds sendo monitoradas'
  readonly aliases = ['list-hunted', 'hunted list', 'hunteds']
  readonly permission = 'admin' as const
  readonly scope = 'admin_group' as const

  constructor(
    private readonly huntedGuildRepository: HuntedGuildRepository,
    private readonly gameWorldRepository: GameWorldRepository,
    private readonly gameServerRepository: GameServerRepository,
    private readonly botGroupRepository: BotGroupRepository,
    private readonly messageSender: MessageSender
  ) {}

  async execute({ chatId }: CommandContext): Promise<void> {
    logger.info(`📋 Listando hunted guilds para grupo ${chatId}`)

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

    if (huntedGuilds.length === 0) {
      await this.messageSender.sendMessage(chatId, {
        text: [
          '📋 *Nenhuma guild sendo monitorada*',
          '',
          'Use: @bot hunted add <servidor> <world> <guild_name>',
          'Exemplo: @bot hunted add rubinot Mystian Genesis'
        ].join('\n')
      })
      return
    }

    // 3. Busca informações de world e servidor para cada guild
    const lines = ['📋 *GUILDS MONITORADAS*', '']

    for (const hg of huntedGuilds) {
      const world = await this.gameWorldRepository.findById(hg.worldId)
      const server = world ? await this.gameServerRepository.findById(world.serverId) : null

      const serverName = server?.displayName || 'Desconhecido'
      const worldName = world?.worldName || 'Desconhecido'

      lines.push(`⚔️ *${hg.guildName}*`)
      lines.push(`   └ ${serverName} • ${worldName}`)
      
      const notifications = []
      if (hg.notifyDeaths) notifications.push('💀 Mortes')
      if (hg.notifyLevelUps) notifications.push(`📈 Level ${hg.minLevelNotify}+`)
      
      lines.push(`   └ ${notifications.join(' • ')}`)
      lines.push('')
    }

    lines.push(`Total: *${huntedGuilds.length}* guild(s)`)

    await this.messageSender.sendMessage(chatId, {
      text: lines.join('\n')
    })
  }
}
