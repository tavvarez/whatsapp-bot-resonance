import type { SupabaseClient } from '@supabase/supabase-js'
import type { BotGroupRepository } from '../../domain/repositories/BotGroupRepository.js'
import type { BotGroup } from '../../domain/entities/BotGroup.js'
import { DatabaseError } from '../../shared/errors/index.js'
import { getSupabaseClient } from './SupabaseClient.js'

export class SupabaseBotGroupRepository implements BotGroupRepository {
  private client: SupabaseClient

  constructor() {
    this.client = getSupabaseClient()
  }

  async findByGroupId(groupId: string): Promise<BotGroup | null> {
    const { data, error } = await this.client
      .from('bot_groups')
      .select('*')
      .eq('group_id', groupId)
      .maybeSingle()

    if (error) {
      throw new DatabaseError('Erro ao buscar grupo', error)
    }

    if (!data) return null

    return this.mapToEntity(data)
  }

  async findByType(type: 'admin' | 'member' | 'notification'): Promise<BotGroup[]> {
    const { data, error } = await this.client
      .from('bot_groups')
      .select('*')
      .eq('group_type', type)
      .eq('is_active', true)

    if (error) {
      throw new DatabaseError('Erro ao buscar grupos por tipo', error)
    }

    return (data ?? []).map(d => this.mapToEntity(d))
  }

  async isAdminGroup(groupId: string): Promise<boolean> {
    const group = await this.findByGroupId(groupId)
    return group?.groupType === 'admin' && group?.isActive === true
  }

  async isMemberGroup(groupId: string): Promise<boolean> {
    const group = await this.findByGroupId(groupId)
    return group?.groupType === 'member' && group?.isActive === true
  }

  async save(group: BotGroup): Promise<BotGroup> {
    const { data, error} = await this.client
      .from('bot_groups')
      .insert({
        group_id: group.groupId,
        group_type: group.groupType,
        description: group.description,
        is_active: group.isActive,
      })
      .select()
      .single()

    if (error) {
      throw new DatabaseError('Erro ao salvar grupo', error)
    }

    return this.mapToEntity(data)
  }

  async listActive(): Promise<BotGroup[]> {
    const { data, error } = await this.client
      .from('bot_groups')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      throw new DatabaseError('Erro ao listar grupos ativos', error)
    }

    return (data ?? []).map(d => this.mapToEntity(d))
  }

  private mapToEntity(data: Record<string, any>): BotGroup {
    const entity: BotGroup = {
      id: data.id,
      groupId: data.group_id,
      groupType: data.group_type,
      isActive: data.is_active ?? true,
    }

    if (data.description) {
      entity.description = data.description
    }
    if (data.tenant_id) {
      entity.tenantId = data.tenant_id
    }
    if (data.tenant_name) {
      entity.tenantName = data.tenant_name
    }
    if (data.created_at) {
      entity.createdAt = new Date(data.created_at)
    }

    return entity
  }
}
