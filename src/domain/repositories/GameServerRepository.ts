import type { GameServer } from '../entities/GameServer.js'

/**
 * Repositório para gerenciar servidores de jogo.
 */
export interface GameServerRepository {
  /**
   * Busca um servidor por ID.
   */
  findById(id: string): Promise<GameServer | null>

  /**
   * Busca um servidor pelo nome (ex: 'rubinot').
   */
  findByName(serverName: string): Promise<GameServer | null>

  /**
   * Lista todos os servidores ativos.
   */
  listActive(): Promise<GameServer[]>

  /**
   * Lista todos os servidores (ativos e inativos).
   */
  listAll(): Promise<GameServer[]>
}
