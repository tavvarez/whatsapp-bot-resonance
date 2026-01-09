/**
 * Usuário do bot com permissões.
 * Representa um usuário que pode interagir com o bot.
 * 
 * IMPORTANTE: 
 * - phoneNumber: número real do WhatsApp (para menções)
 * - lid: Local ID do WhatsApp (usado em grupos com privacidade)
 * - Pelo menos um dos dois deve estar presente
 */
export interface BotUser {
  id?: string
  phoneNumber?: string  // Opcional: número real (para menções)
  lid?: string          // Opcional: Local ID (identificação)
  role: 'admin' | 'member'
  displayName?: string
  createdAt?: Date
  updatedAt?: Date
}
