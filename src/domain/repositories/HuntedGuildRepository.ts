import type { HuntedGuild, CreateHuntedGuildInput } from '../entities/HuntedGuild.js'

/**
 * Repositório para gerenciar guilds monitoradas (hunted guilds).
 */
export interface HuntedGuildRepository {
  /**
   * Salva uma nova hunted guild.
   */
  save(input: CreateHuntedGuildInput): Promise<HuntedGuild>

  /**
   * Busca uma hunted guild por ID.
   */
  findById(id: string): Promise<HuntedGuild | null>

  /**
   * Busca uma hunted guild específica por tenant, world e nome da guild.
   */
  findByTenantWorldAndGuild(
    tenantId: string,
    worldId: string,
    guildName: string
  ): Promise<HuntedGuild | null>

  /**
   * Lista todas as hunted guilds ativas de um tenant.
   */
  listActiveByTenant(tenantId: string): Promise<HuntedGuild[]>

  /**
   * Lista todas as hunted guilds ativas (de todos os tenants).
   * Usado pelos jobs de scraping.
   */
  listAllActive(): Promise<HuntedGuild[]>

  /**
   * Lista todas as hunted guilds de um grupo específico.
   */
  listByGroup(botGroupId: string): Promise<HuntedGuild[]>

  /**
   * Realiza soft delete de uma hunted guild.
   */
  softDelete(id: string, deletedBy?: string): Promise<void>

  /**
   * Reativa uma hunted guild que foi soft deleted.
   */
  activate(id: string): Promise<void>

  /**
   * Atualiza configurações de notificação.
   */
  updateNotificationSettings(
    id: string,
    settings: {
      notifyDeaths?: boolean
      notifyLevelUps?: boolean
      minLevelNotify?: number
    }
  ): Promise<HuntedGuild | null>
}
