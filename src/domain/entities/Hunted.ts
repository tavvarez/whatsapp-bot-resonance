/**
 * Representa um personagem na lista de hunteds.
 * Usado para rastrear level ups.
 */
export interface Hunted {
  id?: string
  playerName: string
  /** Nome normalizado para buscas */
  nameNormalized: string
  /** Último level conhecido */
  lastKnownLevel: number
  /** Vocação do personagem */
  vocation?: string
  /** Guild do personagem (para facilitar buscas) */
  guild: string
  /** Se o tracking está ativo */
  isActive: boolean
  /** Total de levels ganhos hoje */
  levelGainToday: number
  /** Data do último level up (para resetar contador diário) */
  lastLevelUpDate?: Date
  /** Data de criação */
  createdAt?: Date
  /** Última atualização de level */
  updatedAt?: Date
}
