import type { Command, CommandContext } from '../../domain/commands/Command.js'
import type { MessageSender } from '../../domain/services/MessageSender.js'
import type { HuntedGuildRepository } from '../../domain/repositories/HuntedGuildRepository.js'
import type { GameServerRepository } from '../../domain/repositories/GameServerRepository.js'
import type { GameWorldRepository } from '../../domain/repositories/GameWorldRepository.js'
import type { BotGroupRepository } from '../../domain/repositories/BotGroupRepository.js'
import { logger } from '../../shared/utils/logger.js'

/**
 * Comando para adicionar uma guild à lista de monitoramento (hunted list).
 * 
 * Uso: @bot hunted add <servidor> <world> <guild_name>
 * Exemplo: @bot hunted add rubinot Mystian Genesis
 */
export class AddHuntedGuildCommand implements Command {
  readonly name = 'hunted-add'
  readonly description = 'Adiciona uma guild à lista de monitoramento'
  readonly aliases = ['add-hunted', 'hunted add']
  readonly permission = 'admin' as const
  readonly scope = 'admin_group' as const

  constructor(
    private readonly huntedGuildRepository: HuntedGuildRepository,
    private readonly gameServerRepository: GameServerRepository,
    private readonly gameWorldRepository: GameWorldRepository,
    private readonly botGroupRepository: BotGroupRepository,
    private readonly messageSender: MessageSender
  ) {}

  async execute({ text, chatId, sender }: CommandContext): Promise<void> {
    // Parse: <servidor> <world> <guild_name>
    const parts = text.trim().split(/\s+/)

    if (parts.length < 3) {
      await this.messageSender.sendMessage(chatId, {
        text: [
          '❌ *Formato inválido*',
          '',
          'Uso: @bot hunted add <servidor> <world> <guild_name>',
          '',
          'Exemplo: @bot hunted add rubinot Mystian Genesis',
          '',
          '💡 Para ver servidores disponíveis: @bot servers',
          '💡 Para ver worlds de um servidor: @bot worlds rubinot'
        ].join('\n')
      })
      return
    }

    const serverName = parts[0]!.toLowerCase()
    const worldName = parts[1]!
    const guildName = parts.slice(2).join(' ')

    logger.info(`🎯 Admin ${sender} tentando adicionar hunted guild: ${guildName} (${serverName}/${worldName})`)

    // 1. Busca o servidor
    const server = await this.gameServerRepository.findByName(serverName)
    if (!server) {
      await this.messageSender.sendMessage(chatId, {
        text: [
          `❌ Servidor *${serverName}* não encontrado.`,
          '',
          'Servidores disponíveis:',
          '• rubinot',
          '',
          'Use: @bot servers para ver a lista completa'
        ].join('\n')
      })
      return
    }

    if (!server.isActive) {
      await this.messageSender.sendMessage(chatId, {
        text: `⚠️ O servidor *${server.displayName}* está inativo.`
      })
      return
    }

    // 2. Busca o world
    const world = await this.gameWorldRepository.findByServerAndName(server.id!, worldName)
    if (!world) {
      await this.messageSender.sendMessage(chatId, {
        text: [
          `❌ World *${worldName}* não encontrado no servidor *${server.displayName}*.`,
          '',
          `Use: @bot worlds ${serverName} para ver worlds disponíveis`
        ].join('\n')
      })
      return
    }

    if (!world.isActive) {
      await this.messageSender.sendMessage(chatId, {
        text: `⚠️ O world *${world.worldName}* está inativo.`
      })
      return
    }

    // 3. Busca o grupo atual
    const group = await this.botGroupRepository.findByGroupId(chatId)
    if (!group) {
      await this.messageSender.sendMessage(chatId, {
        text: '❌ Este grupo não está cadastrado no banco de dados.'
      })
      return
    }

    if (!group.tenantId) {
      await this.messageSender.sendMessage(chatId, {
        text: '❌ Este grupo não possui um tenant_id configurado. Execute a migração do banco.'
      })
      return
    }

    // 4. Verifica se já existe
    const existing = await this.huntedGuildRepository.findByTenantWorldAndGuild(
      group.tenantId,
      world.id!,
      guildName
    )

    if (existing) {
      if (existing.isActive) {
        await this.messageSender.sendMessage(chatId, {
          text: `⚠️ A guild *${guildName}* já está sendo monitorada no world *${world.worldName}*.`
        })
        return
      } else {
        // Reativa se estava inativa
        await this.huntedGuildRepository.activate(existing.id!)
        await this.messageSender.sendMessage(chatId, {
          text: [
            `✅ *Guild reativada com sucesso!*`,
            '',
            `🎮 Servidor: *${server.displayName}*`,
            `🌍 World: *${world.worldName}*`,
            `⚔️ Guild: *${guildName}*`,
            '',
            `As notificações de mortes e level ups foram reativadas.`
          ].join('\n')
        })
        logger.info(`✅ Hunted guild reativada: ${guildName}`)
        return
      }
    }

    // 5. Cria a nova hunted guild
    const huntedGuild = await this.huntedGuildRepository.save({
      tenantId: group.tenantId,
      tenantName: group.tenantName || 'Default Tenant',
      botGroupId: group.id!,
      worldId: world.id!,
      guildName,
      notifyDeaths: true,
      notifyLevelUps: true,
      minLevelNotify: 600,
      createdBy: sender
    })

    await this.messageSender.sendMessage(chatId, {
      text: [
        `✅ *Guild adicionada à hunted list!*`,
        '',
        `🎮 Servidor: *${server.displayName}*`,
        `🌍 World: *${world.worldName}* (ID: ${world.worldIdentifier})`,
        `⚔️ Guild: *${guildName}*`,
        '',
        `📊 *Configurações:*`,
        `• Notificar mortes: ✅`,
        `• Notificar level ups: ✅`,
        `• Nível mínimo: 600+`,
        '',
        `O bot começará a monitorar esta guild automaticamente.`
      ].join('\n')
    })

    logger.info(`✅ Hunted guild criada: ${guildName} (ID: ${huntedGuild.id})`)
  }
}
