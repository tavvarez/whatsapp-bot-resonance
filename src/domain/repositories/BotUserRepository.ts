import type { BotUser } from '../entities/BotUser.js'

/**
 * Repository para gerenciar usuários do bot e suas permissões.
 */
export interface BotUserRepository {
  /**
   * Busca usuário por número de telefone
   */
  findByPhoneNumber(phoneNumber: string): Promise<BotUser | null>

  /**
   * Busca usuário por LID (Local ID)
   */
  findByLid(lid: string): Promise<BotUser | null>

  /**
   * Busca usuário por phone OU LID (tenta os dois)
   */
  findByPhoneOrLid(identifier: string): Promise<BotUser | null>

  /**
   * Verifica se o usuário é admin (busca por phone ou LID)
   */
  isAdmin(identifier: string): Promise<boolean>

  /**
   * Verifica se o usuário é membro (member ou admin)
   */
  isMember(identifier: string): Promise<boolean>

  /**
   * Salva um novo usuário
   */
  save(user: BotUser): Promise<BotUser>

  /**
   * Atualiza LID de um usuário existente (encontrado por phone)
   */
  updateLid(phoneNumber: string, lid: string): Promise<void>

  /**
   * Atualiza a role de um usuário
   */
  updateRole(phoneNumber: string, role: 'admin' | 'member'): Promise<void>

  /**
   * Lista usuários por role
   */
  listByRole(role: 'admin' | 'member'): Promise<BotUser[]>

  /**
   * Lista todos os usuários
   */
  listAll(): Promise<BotUser[]>
}
