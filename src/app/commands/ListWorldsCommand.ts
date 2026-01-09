import type { Command, CommandContext } from '../../domain/commands/Command.js'
import type { MessageSender } from '../../domain/services/MessageSender.js'
import type { GameServerRepository } from '../../domain/repositories/GameServerRepository.js'
import type { GameWorldRepository } from '../../domain/repositories/GameWorldRepository.js'
import { logger } from '../../shared/utils/logger.js'

/**
 * Comando para listar worlds disponíveis em um servidor.
 * 
 * Uso: @bot worlds <servidor>
 * Exemplo: @bot worlds rubinot
 */
export class ListWorldsCommand implements Command {
  readonly name = 'worlds'
  readonly description = 'Lista worlds disponíveis em um servidor'
  readonly aliases = ['list-worlds', 'mundos']
  readonly permission = 'admin' as const
  readonly scope = 'admin_group' as const

  constructor(
    private readonly gameServerRepository: GameServerRepository,
    private readonly gameWorldRepository: GameWorldRepository,
    private readonly messageSender: MessageSender
  ) {}

  async execute({ text, chatId }: CommandContext): Promise<void> {
    const serverName = text.trim().toLowerCase()

    if (!serverName) {
      // Lista todos os servidores disponíveis
      const servers = await this.gameServerRepository.listActive()

      if (servers.length === 0) {
        await this.messageSender.sendMessage(chatId, {
          text: '❌ Nenhum servidor cadastrado no banco.'
        })
        return
      }

      const lines = ['🎮 *SERVIDORES DISPONÍVEIS*', '']
      for (const server of servers) {
        lines.push(`• *${server.displayName}* (${server.serverName})`)
      }
      lines.push('')
      lines.push('Use: @bot worlds <servidor>')
      lines.push('Exemplo: @bot worlds rubinot')

      await this.messageSender.sendMessage(chatId, {
        text: lines.join('\n')
      })
      return
    }

    logger.info(`🌍 Listando worlds do servidor: ${serverName}`)

    // Busca o servidor
    const server = await this.gameServerRepository.findByName(serverName)
    if (!server) {
      await this.messageSender.sendMessage(chatId, {
        text: [
          `❌ Servidor *${serverName}* não encontrado.`,
          '',
          'Use: @bot worlds (sem argumentos) para ver servidores disponíveis'
        ].join('\n')
      })
      return
    }

    // Lista worlds do servidor
    const worlds = await this.gameWorldRepository.listActiveByServer(server.id!)

    if (worlds.length === 0) {
      await this.messageSender.sendMessage(chatId, {
        text: `⚠️ Nenhum world cadastrado para o servidor *${server.displayName}*.`
      })
      return
    }

    const lines = [
      `🌍 *WORLDS - ${server.displayName.toUpperCase()}*`,
      ''
    ]

    for (const world of worlds) {
      lines.push(`• *${world.worldName}* (ID: ${world.worldIdentifier})`)
    }

    lines.push('')
    lines.push(`Total: *${worlds.length}* world(s)`)

    await this.messageSender.sendMessage(chatId, {
      text: lines.join('\n')
    })
  }
}
