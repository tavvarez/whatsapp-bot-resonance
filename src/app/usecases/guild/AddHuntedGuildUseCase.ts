import type { HuntedGuildRepository } from '../../../domain/repositories/HuntedGuildRepository.js'
import type { GameServerRepository } from '../../../domain/repositories/GameServerRepository.js'
import type { GameWorldRepository } from '../../../domain/repositories/GameWorldRepository.js'
import type { BotGroupRepository } from '../../../domain/repositories/BotGroupRepository.js'
import type { HuntedGuild } from '../../../domain/entities/HuntedGuild.js'
import { BusinessError } from '../../../shared/errors/BusinessError.js'
import { logger } from '../../../shared/utils/logger.js'

export interface AddHuntedGuildInput {
  tenantId: string
  tenantName: string
  botGroupId: string
  serverName: string
  worldName: string
  guildName: string
  notifyDeaths?: boolean
  notifyLevelUps?: boolean
  minLevelNotify?: number
  createdBy?: string
}

/**
 * Use case para adicionar uma guild à lista de monitoramento.
 * Reutilizável tanto pelo comando do WhatsApp quanto pela API.
 */
export class AddHuntedGuildUseCase {
  constructor(
    private huntedGuildRepository: HuntedGuildRepository,
    private gameServerRepository: GameServerRepository,
    private gameWorldRepository: GameWorldRepository,
    private botGroupRepository: BotGroupRepository
  ) {}

  async execute(input: AddHuntedGuildInput): Promise<HuntedGuild> {
    logger.info(`🎯 Adicionando hunted guild: ${input.guildName} (${input.serverName}/${input.worldName})`)

    // 1. Valida servidor
    const server = await this.gameServerRepository.findByName(input.serverName)
    if (!server) {
      throw new BusinessError(`Servidor "${input.serverName}" não encontrado`)
    }

    if (!server.isActive) {
      throw new BusinessError(`Servidor "${server.displayName}" está inativo`)
    }

    // 2. Valida world
    const world = await this.gameWorldRepository.findByServerAndName(
      server.id!,
      input.worldName
    )
    if (!world) {
      throw new BusinessError(
        `World "${input.worldName}" não encontrado no servidor "${server.displayName}"`
      )
    }

    if (!world.isActive) {
      throw new BusinessError(`World "${world.worldName}" está inativo`)
    }

    // 3. Verifica duplicata
    const existing = await this.huntedGuildRepository.findByTenantWorldAndGuild(
      input.tenantId,
      world.id!,
      input.guildName
    )

    if (existing) {
      if (existing.isActive) {
        throw new BusinessError(
          `Guild "${input.guildName}" já está sendo monitorada no world "${world.worldName}"`
        )
      } else {
        // Reativa guild inativa
        await this.huntedGuildRepository.activate(existing.id!)
        logger.info(`✅ Guild "${input.guildName}" reativada`)
        return existing
      }
    }

    // 4. Cria nova hunted guild
    const huntedGuild = await this.huntedGuildRepository.save({
      tenantId: input.tenantId,
      tenantName: input.tenantName,
      botGroupId: input.botGroupId,
      worldId: world.id!,
      guildName: input.guildName,
      notifyDeaths: input.notifyDeaths ?? true,
      notifyLevelUps: input.notifyLevelUps ?? true,
      minLevelNotify: input.minLevelNotify ?? 600,
      createdBy: input.createdBy
    })

    logger.info(`✅ Hunted guild criada: ${huntedGuild.guildName} (ID: ${huntedGuild.id})`)

    return huntedGuild
  }
}
