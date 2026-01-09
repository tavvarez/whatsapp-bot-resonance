import type { GameWorldRepository } from '../../domain/repositories/GameWorldRepository.js'
import type { GameWorld } from '../../domain/entities/GameWorld.js'
import { DatabaseError } from '../../shared/errors/index.js'
import { getSupabaseClient } from './SupabaseClient.js'

export class SupabaseGameWorldRepository implements GameWorldRepository {
  private toDomain(data: any): GameWorld {
    const world: GameWorld = {
      id: data.id,
      serverId: data.server_id,
      worldName: data.world_name,
      worldIdentifier: data.world_identifier,
      isActive: data.is_active
    }
    
    if (data.created_at) world.createdAt = new Date(data.created_at)
    if (data.updated_at) world.updatedAt = new Date(data.updated_at)
    
    return world
  }

  async findById(id: string): Promise<GameWorld | null> {
    const { data, error } = await getSupabaseClient()
      .from('game_worlds')
      .select('*')
      .eq('id', id)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new DatabaseError(`Erro ao buscar world por ID: ${error.message}`)
    }

    return data ? this.toDomain(data) : null
  }

  async findByServerAndName(serverId: string, worldName: string): Promise<GameWorld | null> {
    const { data, error } = await getSupabaseClient()
      .from('game_worlds')
      .select('*')
      .eq('server_id', serverId)
      .ilike('world_name', worldName)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new DatabaseError(`Erro ao buscar world: ${error.message}`)
    }

    return data ? this.toDomain(data) : null
  }

  async listByServer(serverId: string): Promise<GameWorld[]> {
    const { data, error } = await getSupabaseClient()
      .from('game_worlds')
      .select('*')
      .eq('server_id', serverId)
      .order('world_name')

    if (error) {
      throw new DatabaseError(`Erro ao listar worlds: ${error.message}`)
    }

    return data ? data.map(d => this.toDomain(d)) : []
  }

  async listActiveByServer(serverId: string): Promise<GameWorld[]> {
    const { data, error } = await getSupabaseClient()
      .from('game_worlds')
      .select('*')
      .eq('server_id', serverId)
      .eq('is_active', true)
      .order('world_name')

    if (error) {
      throw new DatabaseError(`Erro ao listar worlds ativos: ${error.message}`)
    }

    return data ? data.map(d => this.toDomain(d)) : []
  }

  async listAllActive(): Promise<GameWorld[]> {
    const { data, error } = await getSupabaseClient()
      .from('game_worlds')
      .select('*')
      .eq('is_active', true)
      .order('world_name')

    if (error) {
      throw new DatabaseError(`Erro ao listar todos os worlds ativos: ${error.message}`)
    }

    return data ? data.map(d => this.toDomain(d)) : []
  }
}
