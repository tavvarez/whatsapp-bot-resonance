/**
 * Representa um servidor de jogo (Rubinot, Tibia Global, etc).
 */
export type ScraperType = 'rubinot' | 'tibia_official' | 'generic_ots'

export interface GameServer {
  id?: string
  serverName: string // 'rubinot', 'tibia_global', 'otservbr'
  displayName: string // 'Rubinot', 'Tibia Global', 'OTServBR'
  baseUrl: string // 'https://rubinot.com.br'
  scraperType: ScraperType
  isActive: boolean
  createdAt?: Date
  updatedAt?: Date
}
