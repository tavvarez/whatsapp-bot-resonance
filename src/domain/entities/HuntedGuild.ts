/**
 * Representa uma guild sendo monitorada para notificações de death/level up.
 * Permite multi-tenancy (múltiplos clientes usando o mesmo bot).
 */
export interface HuntedGuild {
  id?: string
  tenantId: string
  tenantName: string
  botGroupId: string
  worldId: string
  guildName: string
  guildNameNormalized: string
  notifyDeaths: boolean
  notifyLevelUps: boolean
  minLevelNotify: number
  isActive: boolean
  deletedAt?: Date
  createdAt?: Date
  updatedAt?: Date
  createdBy?: string // phone_number ou LID do admin que criou
}

/**
 * Input para criação de uma nova hunted guild.
 */
export interface CreateHuntedGuildInput {
  tenantId: string
  tenantName: string
  botGroupId: string
  worldId: string
  guildName: string
  notifyDeaths?: boolean
  notifyLevelUps?: boolean
  minLevelNotify?: number
  createdBy?: string
}
