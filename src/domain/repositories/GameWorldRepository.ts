import type { GameWorld } from '../entities/GameWorld.js'

/**
 * Repositório para gerenciar worlds/mundos de jogo.
 */
export interface GameWorldRepository {
  /**
   * Busca um world por ID.
   */
  findById(id: string): Promise<GameWorld | null>

  /**
   * Busca um world pelo servidor e nome (ex: server='rubinot', name='Mystian').
   */
  findByServerAndName(serverId: string, worldName: string): Promise<GameWorld | null>

  /**
   * Lista todos os worlds de um servidor específico.
   */
  listByServer(serverId: string): Promise<GameWorld[]>

  /**
   * Lista todos os worlds ativos de um servidor.
   */
  listActiveByServer(serverId: string): Promise<GameWorld[]>

  /**
   * Lista todos os worlds ativos (de todos os servidores).
   */
  listAllActive(): Promise<GameWorld[]>
}
