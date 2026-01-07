import { createClient, type SupabaseClient as SupabaseClientType } from '@supabase/supabase-js'
import { config } from '../../config/index.js'
import { DatabaseError } from '../../shared/errors/index.js'
import { logger } from '../../shared/utils/logger.js'

/**
 * Singleton do cliente Supabase.
 * Garante que apenas uma instância do cliente seja criada e reutilizada
 * em toda a aplicação, evitando múltiplas conexões desnecessárias.
 */
class SupabaseClientSingleton {
  private static instance: SupabaseClientType | null = null

  private constructor() {
    // Construtor privado para impedir instanciação direta
  }

  /**
   * Retorna a instância única do cliente Supabase.
   * Cria a instância na primeira chamada e reutiliza nas próximas.
   */
  static getInstance(): SupabaseClientType {
    if (!this.instance) {
      try {
        this.instance = createClient(
          config.supabase.url,
          config.supabase.serviceRoleKey,
          {
            auth: {
              autoRefreshToken: true,
              persistSession: false, // Não precisa persistir sessão em backend
            },
          }
        )
        logger.debug('✅ Cliente Supabase inicializado')
      } catch (error) {
        throw new DatabaseError('Falha ao criar cliente Supabase', error)
      }
    }

    return this.instance
  }

  /**
   * Reseta a instância (útil para testes)
   */
  static reset(): void {
    this.instance = null
  }
}

/**
 * Função helper para obter o cliente Supabase.
 * Use esta função em todos os repositories.
 */
export function getSupabaseClient(): SupabaseClientType {
  return SupabaseClientSingleton.getInstance()
}

/**
 * Reseta o cliente (útil para testes)
 */
export function resetSupabaseClient(): void {
  SupabaseClientSingleton.reset()
}

