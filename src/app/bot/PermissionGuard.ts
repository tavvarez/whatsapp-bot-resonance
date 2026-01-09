import type { BotUserRepository } from '../../domain/repositories/BotUserRepository.js'
import type { BotGroupRepository } from '../../domain/repositories/BotGroupRepository.js'
import { logger } from '../../shared/utils/logger.js'

export type PermissionLevel = 'admin' | 'member' | 'any'

/**
 * Guard de permissões para comandos do bot.
 * Verifica se usuários e grupos têm permissão para executar comandos.
 */
export class PermissionGuard {
  constructor(
    private userRepo: BotUserRepository,
    private groupRepo: BotGroupRepository
  ) {}

  /**
   * Verifica se o usuário tem a permissão necessária
   */
  async hasPermission(
    phoneNumber: string,
    groupId: string,
    requiredLevel: PermissionLevel
  ): Promise<boolean> {
    try {
      // Se qualquer um pode usar, permite
      if (requiredLevel === 'any') {
        return true
      }

      // Verifica se é admin
      const isAdmin = await this.userRepo.isAdmin(phoneNumber)
      if (isAdmin) {
        // Admin tem acesso a tudo
        logger.debug(`✅ Admin detectado: ${phoneNumber}`)
        return true
      }

      // Se requer admin e não é, nega
      if (requiredLevel === 'admin') {
        logger.warn(`🚫 Acesso negado: ${phoneNumber} tentou comando admin`)
        return false
      }

      // Verifica se é member
      if (requiredLevel === 'member') {
        const isMember = await this.userRepo.isMember(phoneNumber)
        if (!isMember) {
          logger.warn(`🚫 Usuário não é membro: ${phoneNumber}`)
        }
        return isMember
      }

      return false
    } catch (error) {
      logger.error('Erro ao verificar permissão de usuário', error)
      return false
    }
  }

  /**
   * Verifica se o grupo permite o tipo de comando
   */
  async isGroupAllowed(
    groupId: string,
    commandType: 'admin' | 'member'
  ): Promise<boolean> {
    try {
      if (commandType === 'admin') {
        const isAllowed = await this.groupRepo.isAdminGroup(groupId)
        if (!isAllowed) {
          logger.warn(`🚫 Comando admin usado fora do grupo admin: ${groupId}`)
        }
        return isAllowed
      }
      
      if (commandType === 'member') {
        const isAllowed = await this.groupRepo.isMemberGroup(groupId)
        if (!isAllowed) {
          logger.warn(`🚫 Comando member usado fora do grupo member: ${groupId}`)
        }
        return isAllowed
      }

      return false
    } catch (error) {
      logger.error('Erro ao verificar permissão de grupo', error)
      return false
    }
  }

  /**
   * Verifica se o usuário é admin (helper)
   */
  async isAdmin(phoneNumber: string): Promise<boolean> {
    try {
      return await this.userRepo.isAdmin(phoneNumber)
    } catch (error) {
      logger.error('Erro ao verificar se é admin', error)
      return false
    }
  }

  /**
   * Verifica se o usuário é membro (helper)
   */
  async isMember(phoneNumber: string): Promise<boolean> {
    try {
      return await this.userRepo.isMember(phoneNumber)
    } catch (error) {
      logger.error('Erro ao verificar se é membro', error)
      return false
    }
  }
}
