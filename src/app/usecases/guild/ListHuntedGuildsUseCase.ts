import type { HuntedGuildRepository } from '../../../domain/repositories/HuntedGuildRepository.js'
import type { GameWorldRepository } from '../../../domain/repositories/GameWorldRepository.js'
import type { GameServerRepository } from '../../../domain/repositories/GameServerRepository.js'
import { logger } from '../../../shared/utils/logger.js'

export interface ListHuntedGuildsInput {
  tenantId: string
}

export interface HuntedGuildWithDetails {
  id: string
  guildName: string
  serverName: string
  serverDisplayName: string
  worldName: string
  worldIdentifier: string
  notifyDeaths: boolean
  notifyLevelUps: boolean
  minLevelNotify: number
  isActive: boolean
  createdAt?: Date | undefined
}

/**
 * Use case para listar guilds monitoradas de um tenant.
 * Retorna informações completas incluindo servidor e world.
 */
export class ListHuntedGuildsUseCase {
  constructor(
    private huntedGuildRepository: HuntedGuildRepository,
    private gameWorldRepository: GameWorldRepository,
    private gameServerRepository: GameServerRepository
  ) {}

  async execute(input: ListHuntedGuildsInput): Promise<HuntedGuildWithDetails[]> {
    logger.info(`📋 Listando hunted guilds do tenant: ${input.tenantId}`)

    // 1. Busca todas as guilds ativas do tenant
    const huntedGuilds = await this.huntedGuildRepository.listActiveByTenant(input.tenantId)

    if (huntedGuilds.length === 0) {
      logger.info('⚠️ Nenhuma guild monitorada encontrada')
      return []
    }

    // 2. Enriquece com informações de world e servidor
    const guildsWithDetails: HuntedGuildWithDetails[] = []

    for (const guild of huntedGuilds) {
      const world = await this.gameWorldRepository.findById(guild.worldId)
      if (!world) continue

      const server = await this.gameServerRepository.findById(world.serverId)
      if (!server) continue

      guildsWithDetails.push({
        id: guild.id!,
        guildName: guild.guildName,
        serverName: server.serverName,
        serverDisplayName: server.displayName,
        worldName: world.worldName,
        worldIdentifier: world.worldIdentifier,
        notifyDeaths: guild.notifyDeaths,
        notifyLevelUps: guild.notifyLevelUps,
        minLevelNotify: guild.minLevelNotify,
        isActive: guild.isActive,
        createdAt: guild.createdAt
      })
    }

    logger.info(`✅ ${guildsWithDetails.length} guild(s) encontrada(s)`)

    return guildsWithDetails
  }
}
