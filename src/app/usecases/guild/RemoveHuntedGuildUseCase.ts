import type { HuntedGuildRepository } from '../../../domain/repositories/HuntedGuildRepository.js'
import { BusinessError } from '../../../shared/errors/BusinessError.js'
import { logger } from '../../../shared/utils/logger.js'

export interface RemoveHuntedGuildInput {
  guildId: string
  tenantId: string
  deletedBy?: string
}

/**
 * Use case para remover (soft delete) uma guild da lista de monitoramento.
 */
export class RemoveHuntedGuildUseCase {
  constructor(
    private huntedGuildRepository: HuntedGuildRepository
  ) {}

  async execute(input: RemoveHuntedGuildInput): Promise<void> {
    logger.info(`🗑️ Removendo hunted guild: ${input.guildId}`)

    // 1. Busca a guild
    const guild = await this.huntedGuildRepository.findById(input.guildId)

    if (!guild) {
      throw new BusinessError('Guild não encontrada')
    }

    // 2. Verifica se pertence ao tenant
    if (guild.tenantId !== input.tenantId) {
      throw new BusinessError('Você não tem permissão para remover esta guild')
    }

    // 3. Verifica se já está inativa
    if (!guild.isActive) {
      throw new BusinessError('Guild já está inativa')
    }

    // 4. Faz soft delete
    await this.huntedGuildRepository.softDelete(input.guildId, input.deletedBy)

    logger.info(`✅ Hunted guild removida: ${guild.guildName}`)
  }
}
