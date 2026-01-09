import type { GameServerRepository } from '../../domain/repositories/GameServerRepository.js'
import type { GameServer } from '../../domain/entities/GameServer.js'
import { DatabaseError } from '../../shared/errors/index.js'
import { getSupabaseClient } from './SupabaseClient.js'

export class SupabaseGameServerRepository implements GameServerRepository {
  private toDomain(data: any): GameServer {
    const server: GameServer = {
      id: data.id,
      serverName: data.server_name,
      displayName: data.display_name,
      baseUrl: data.base_url,
      scraperType: data.scraper_type,
      isActive: data.is_active
    }
    
    if (data.created_at) server.createdAt = new Date(data.created_at)
    if (data.updated_at) server.updatedAt = new Date(data.updated_at)
    
    return server
  }

  async findById(id: string): Promise<GameServer | null> {
    const { data, error } = await getSupabaseClient()
      .from('game_servers')
      .select('*')
      .eq('id', id)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new DatabaseError(`Erro ao buscar servidor por ID: ${error.message}`)
    }

    return data ? this.toDomain(data) : null
  }

  async findByName(serverName: string): Promise<GameServer | null> {
    const { data, error } = await getSupabaseClient()
      .from('game_servers')
      .select('*')
      .eq('server_name', serverName)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw new DatabaseError(`Erro ao buscar servidor por nome: ${error.message}`)
    }

    return data ? this.toDomain(data) : null
  }

  async listActive(): Promise<GameServer[]> {
    const { data, error } = await getSupabaseClient()
      .from('game_servers')
      .select('*')
      .eq('is_active', true)
      .order('display_name')

    if (error) {
      throw new DatabaseError(`Erro ao listar servidores ativos: ${error.message}`)
    }

    return data ? data.map(d => this.toDomain(d)) : []
  }

  async listAll(): Promise<GameServer[]> {
    const { data, error } = await getSupabaseClient()
      .from('game_servers')
      .select('*')
      .order('display_name')

    if (error) {
      throw new DatabaseError(`Erro ao listar servidores: ${error.message}`)
    }

    return data ? data.map(d => this.toDomain(d)) : []
  }
}
