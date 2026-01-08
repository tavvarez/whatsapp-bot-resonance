/**
 * Grupo do WhatsApp registrado no bot.
 * Define o tipo e propósito de cada grupo.
 */
export interface BotGroup {
  id?: string
  groupId: string
  groupType: 'admin' | 'member' | 'notification'
  description?: string
  isActive: boolean
  createdAt?: Date
}
