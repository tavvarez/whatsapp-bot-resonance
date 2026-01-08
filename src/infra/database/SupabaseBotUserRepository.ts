import type { SupabaseClient } from '@supabase/supabase-js'
import type { BotUserRepository } from '../../domain/repositories/BotUserRepository.js'
import type { BotUser } from '../../domain/entities/BotUser.js'
import { DatabaseError } from '../../shared/errors/index.js'
import { getSupabaseClient } from './SupabaseClient.js'

export class SupabaseBotUserRepository implements BotUserRepository {
  private client: SupabaseClient

  constructor() {
    this.client = getSupabaseClient()
  }

  async findByPhoneNumber(phoneNumber: string): Promise<BotUser | null> {
    const { data, error } = await this.client
      .from('bot_users')
      .select('*')
      .eq('phone_number', phoneNumber)
      .maybeSingle()

    if (error) {
      throw new DatabaseError('Erro ao buscar usuário do bot por telefone', error)
    }

    if (!data) return null

    return this.mapToEntity(data)
  }

  async findByLid(lid: string): Promise<BotUser | null> {
    const { data, error } = await this.client
      .from('bot_users')
      .select('*')
      .eq('lid', lid)
      .maybeSingle()

    if (error) {
      throw new DatabaseError('Erro ao buscar usuário do bot por LID', error)
    }

    if (!data) return null

    return this.mapToEntity(data)
  }

  async findByPhoneOrLid(identifier: string): Promise<BotUser | null> {
    // Tenta buscar por LID primeiro (mais comum em grupos modernos)
    let user = await this.findByLid(identifier)
    
    // Se não encontrou, tenta por telefone
    if (!user) {
      user = await this.findByPhoneNumber(identifier)
    }

    return user
  }

  async isAdmin(identifier: string): Promise<boolean> {
    const user = await this.findByPhoneOrLid(identifier)
    return user?.role === 'admin'
  }

  async isMember(identifier: string): Promise<boolean> {
    const user = await this.findByPhoneOrLid(identifier)
    // Admin também é considerado member
    return user?.role === 'member' || user?.role === 'admin'
  }

  async save(user: BotUser): Promise<BotUser> {
    const { data, error } = await this.client
      .from('bot_users')
      .insert({
        phone_number: user.phoneNumber || null,
        lid: user.lid || null,
        role: user.role,
        display_name: user.displayName,
      })
      .select()
      .single()

    if (error) {
      throw new DatabaseError('Erro ao salvar usuário do bot', error)
    }

    return this.mapToEntity(data)
  }

  async updateRole(phoneNumber: string, role: 'admin' | 'member'): Promise<void> {
    const { error } = await this.client
      .from('bot_users')
      .update({
        role,
        updated_at: new Date().toISOString()
      })
      .eq('phone_number', phoneNumber)

    if (error) {
      throw new DatabaseError('Erro ao atualizar role do usuário', error)
    }
  }

  async updateLid(phoneNumber: string, lid: string): Promise<void> {
    const { error } = await this.client
      .from('bot_users')
      .update({
        lid,
        updated_at: new Date().toISOString()
      })
      .eq('phone_number', phoneNumber)

    if (error) {
      throw new DatabaseError('Erro ao atualizar LID do usuário', error)
    }
  }

  async listByRole(role: 'admin' | 'member'): Promise<BotUser[]> {
    const { data, error } = await this.client
      .from('bot_users')
      .select('*')
      .eq('role', role)
      .order('display_name', { ascending: true })

    if (error) {
      throw new DatabaseError('Erro ao listar usuários por role', error)
    }

    return (data ?? []).map(d => this.mapToEntity(d))
  }

  async listAll(): Promise<BotUser[]> {
    const { data, error } = await this.client
      .from('bot_users')
      .select('*')
      .order('display_name', { ascending: true })

    if (error) {
      throw new DatabaseError('Erro ao listar todos os usuários', error)
    }

    return (data ?? []).map(d => this.mapToEntity(d))
  }

  private mapToEntity(data: Record<string, any>): BotUser {
    const entity: BotUser = {
      id: data.id,
      role: data.role,
    }

    if (data.phone_number) {
      entity.phoneNumber = data.phone_number
    }
    if (data.lid) {
      entity.lid = data.lid
    }
    if (data.display_name) {
      entity.displayName = data.display_name
    }
    if (data.created_at) {
      entity.createdAt = new Date(data.created_at)
    }
    if (data.updated_at) {
      entity.updatedAt = new Date(data.updated_at)
    }

    return entity
  }
}
