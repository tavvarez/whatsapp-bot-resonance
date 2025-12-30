import type { Hunted } from '../entities/Hunted.js'

export interface CreateHuntedInput {
  playerName: string
  level: number
  vocation?: string
  guild: string
}

export interface UpdateLevelInput {
  nameNormalized: string
  newLevel: number
}

export interface HuntedRepository {
  /**
   * Busca todos os hunteds ativos de uma guild.
   */
  findActiveByGuild(guild: string): Promise<Hunted[]>

  /**
   * Busca um hunted pelo nome normalizado.
   */
  findByName(nameNormalized: string): Promise<Hunted | null>

  /**
   * Verifica se um player já está na lista.
   */
  existsByName(nameNormalized: string): Promise<boolean>

  /**
   * Adiciona um novo hunted.
   */
  save(input: CreateHuntedInput): Promise<Hunted>

  /**
   * Atualiza o level de um hunted.
   */
  updateLevel(input: UpdateLevelInput): Promise<void>

  /**
   * Atualiza múltiplos levels de uma vez (batch update).
   * Mais eficiente para updates em massa.
   */
  batchUpdateLevels(updates: UpdateLevelInput[]): Promise<void>

  /**
   * Desativa um hunted (soft delete).
   */
  deactivate(nameNormalized: string): Promise<void>
}

