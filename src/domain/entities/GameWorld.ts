/**
 * Representa um mundo/world em um servidor de jogo.
 */
export interface GameWorld {
  id?: string
  serverId: string
  worldName: string // 'Mystian', 'Antica', 'Belobra'
  worldIdentifier: string // '18' para Rubinot, 'Antica' para Tibia Global
  isActive: boolean
  createdAt?: Date
  updatedAt?: Date
}
