import type { BotGroup } from '../entities/BotGroup.js'

/**
 * Repository para gerenciar grupos do WhatsApp.
 */
export interface BotGroupRepository {
  /**
   * Busca grupo por ID do WhatsApp
   */
  findByGroupId(groupId: string): Promise<BotGroup | null>

  /**
   * Busca grupos por tipo
   */
  findByType(type: 'admin' | 'member' | 'notification'): Promise<BotGroup[]>

  /**
   * Verifica se o grupo é do tipo admin
   */
  isAdminGroup(groupId: string): Promise<boolean>

  /**
   * Verifica se o grupo é do tipo member
   */
  isMemberGroup(groupId: string): Promise<boolean>

  /**
   * Salva um novo grupo
   */
  save(group: BotGroup): Promise<BotGroup>

  /**
   * Lista todos os grupos ativos
   */
  listActive(): Promise<BotGroup[]>
}
