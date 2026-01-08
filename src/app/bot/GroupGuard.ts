import type { BotGroupRepository } from '../../domain/repositories/BotGroupRepository.js'
import { logger } from '../../shared/utils/logger.js'

/**
 * Guard que verifica se mensagens vêm de grupos cadastrados.
 * Usa o repositório para validar grupos dinamicamente.
 */
export class GroupGuard {
  private groupCache = new Map<string, boolean>()
  private lastCacheUpdate = 0
  private readonly CACHE_TTL = 60000 // 1 minuto

  constructor(private groupRepository: BotGroupRepository) {}

  async isAllowed(chatId: string): Promise<boolean> {
    // Não é grupo? Não permite (bot só funciona em grupos)
    if (!chatId.endsWith('@g.us')) {
      logger.debug(`❌ Não é grupo: ${chatId}`)
      return false
    }

    // Atualiza cache se expirou
    if (Date.now() - this.lastCacheUpdate > this.CACHE_TTL) {
      await this.refreshCache()
    }

    const isAllowed = this.groupCache.has(chatId)
    if (!isAllowed) {
      logger.debug(`🚫 Grupo não cadastrado: ${chatId}`)
    }

    return isAllowed
  }

  private async refreshCache(): Promise<void> {
    try {
      const groups = await this.groupRepository.listActive()
      this.groupCache.clear()
      
      groups.forEach(group => {
        this.groupCache.set(group.groupId, true)
        logger.debug(`  ✅ Grupo cadastrado: ${group.groupId} (${group.groupType})`)
      })
      
      this.lastCacheUpdate = Date.now()
      logger.info(`🔄 Cache de grupos atualizado: ${groups.length} grupos`)
    } catch (error) {
      logger.error('Erro ao atualizar cache de grupos', error)
    }
  }

  /**
   * Força atualização do cache (útil para testes ou após cadastrar novo grupo)
   */
  async forceRefresh(): Promise<void> {
    await this.refreshCache()
  }
}
  