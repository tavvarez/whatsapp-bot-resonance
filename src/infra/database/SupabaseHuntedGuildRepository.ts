import type { HuntedGuildRepository } from '../../domain/repositories/HuntedGuildRepository.js'
import type { HuntedGuild, CreateHuntedGuildInput } from '../../domain/entities/HuntedGuild.js'
import { DatabaseError } from '../../shared/errors/index.js'
import { normalizeText } from '../../shared/utils/normalizeText.js'
import { getSupabaseClient } from './SupabaseClient.js'

export class SupabaseHuntedGuildRepository implements HuntedGuildRepository {
  private toDomain(data: any): HuntedGuild {
    const guild: HuntedGuild = {
      id: data.id,
      tenantId: data.tenant_id,
      tenantName: data.tenant_name,
      botGroupId: data.bot_group_id,
      worldId: data.world_id,
      guildName: data.guild_name,
      guildNameNormalized: data.guild_name_normalized,
      notifyDeaths: data.notify_deaths,
      notifyLevelUps: data.notify_level_ups,
      minLevelNotify: data.min_level_notify,
      isActive: data.is_active
    }
    
    if (data.deleted_at) guild.deletedAt = new Date(data.deleted_at)
    if (data.created_at) guild.createdAt = new Date(data.created_at)
    if (data.updated_at) guild.updatedAt = new Date(data.updated_at)
    if (data.created_by) guild.createdBy = data.created_by
    
    return guild
  }

  async save(input: CreateHuntedGuildInput): Promise<HuntedGuild> {
    const { data, error } = await getSupabaseClient()
      .from('hunted_guilds')
      .insert({
        tenant_id: input.tenantId,
        tenant_name: input.tenantName,
        bot_group_id: input.botGroupId,
        world_id: input.worldId,
        guild_name: input.guildName,
        guild_name_normalized: normalizeText(input.guildName),
        notify_deaths: input.notifyDeaths ?? true,
        notify_level_ups: input.notifyLevelUps ?? true,
        min_level_notify: input.minLevelNotify ?? 600,
        created_by: input.createdBy
      })
      .select()
      .single()

    if (error) {
      throw new DatabaseError(`Erro ao salvar hunted guild: ${error.message}`)
    }

    return this.toDomain(data)
  }

  async findById(id: string): Promise<HuntedGuild | null> {
    const { data, error } = await getSupabaseClient()
      .from('hunted_guilds')
      .select('*')
      .eq('id', id)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new DatabaseError(`Erro ao buscar hunted guild por ID: ${error.message}`)
    }

    return data ? this.toDomain(data) : null
  }

  async findByTenantWorldAndGuild(
    tenantId: string,
    worldId: string,
    guildName: string
  ): Promise<HuntedGuild | null> {
    const normalized = normalizeText(guildName)

    const { data, error } = await getSupabaseClient()
      .from('hunted_guilds')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('world_id', worldId)
      .eq('guild_name_normalized', normalized)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new DatabaseError(`Erro ao buscar hunted guild: ${error.message}`)
    }

    return data ? this.toDomain(data) : null
  }

  async listActiveByTenant(tenantId: string): Promise<HuntedGuild[]> {
    const { data, error } = await getSupabaseClient()
      .from('hunted_guilds')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      throw new DatabaseError(`Erro ao listar hunted guilds do tenant: ${error.message}`)
    }

    return data ? data.map(d => this.toDomain(d)) : []
  }

  async listAllActive(): Promise<HuntedGuild[]> {
    const { data, error } = await getSupabaseClient()
      .from('hunted_guilds')
      .select('*')
      .eq('is_active', true)
      .order('tenant_id', { ascending: true })

    if (error) {
      throw new DatabaseError(`Erro ao listar todas hunted guilds ativas: ${error.message}`)
    }

    return data ? data.map(d => this.toDomain(d)) : []
  }

  async listByGroup(botGroupId: string): Promise<HuntedGuild[]> {
    const { data, error } = await getSupabaseClient()
      .from('hunted_guilds')
      .select('*')
      .eq('bot_group_id', botGroupId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new DatabaseError(`Erro ao listar hunted guilds do grupo: ${error.message}`)
    }

    return data ? data.map(d => this.toDomain(d)) : []
  }

  async softDelete(id: string, deletedBy?: string): Promise<void> {
    const { error } = await getSupabaseClient()
      .from('hunted_guilds')
      .update({
        is_active: false,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      throw new DatabaseError(`Erro ao fazer soft delete: ${error.message}`)
    }
  }

  async activate(id: string): Promise<void> {
    const { error } = await getSupabaseClient()
      .from('hunted_guilds')
      .update({
        is_active: true,
        deleted_at: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      throw new DatabaseError(`Erro ao reativar hunted guild: ${error.message}`)
    }
  }

  async updateNotificationSettings(
    id: string,
    settings: {
      notifyDeaths?: boolean
      notifyLevelUps?: boolean
      minLevelNotify?: number
    }
  ): Promise<HuntedGuild | null> {
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (settings.notifyDeaths !== undefined) {
      updateData.notify_deaths = settings.notifyDeaths
    }
    if (settings.notifyLevelUps !== undefined) {
      updateData.notify_level_ups = settings.notifyLevelUps
    }
    if (settings.minLevelNotify !== undefined) {
      updateData.min_level_notify = settings.minLevelNotify
    }

    const { data, error } = await getSupabaseClient()
      .from('hunted_guilds')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new DatabaseError(`Erro ao atualizar configurações: ${error.message}`)
    }

    return data ? this.toDomain(data) : null
  }
}
