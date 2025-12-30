import { createClient } from '@supabase/supabase-js'
import type { DeathRepository } from '../../domain/repositories/DeathRepository.js'
import type { DeathEvent } from '../../domain/entities/DeathEvent.js'
import { DatabaseError } from '../../shared/errors/index.js'

export class SupabaseDeathRepository implements DeathRepository {
  private client = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  async existsByHash(hash: string): Promise<boolean> {
    const { data, error } = await this.client
      .from('death_events')
      .select('id')
      .eq('hash', hash)
      .maybeSingle()

    if (error) {
      throw new DatabaseError('Erro ao verificar hash no banco de dados', error)
    }

    return !!data
  }

  async save(event: DeathEvent): Promise<void> {
    const { error } = await this.client
      .from('death_events')
      .upsert(
        {
          world: event.world,
          guild: event.guild,
          player_name: event.playerName,
          level: event.level,
          occurred_at: event.occurredAt.toISOString(),
          raw_text: event.rawText,
          hash: event.hash
        },
        {
          onConflict: 'hash',      // Se hash já existe, ignora
          ignoreDuplicates: true   // Não faz update, só ignora
        }
      )
  
    if (error) {
      throw new DatabaseError('Erro ao salvar evento de morte', error)
    }
  }

  async findUnnotified(limit = 10): Promise<DeathEvent[]> {
    const { data, error } = await this.client
      .from('death_events')
      .select('*')
      .is('notified_at', null)
      .order('occurred_at', { ascending: true })
      .limit(limit)
  
    if (error) {
      throw new DatabaseError('Erro ao buscar mortes não notificadas', error)
    }
  
    if (!data) return []
  
    return data.map(d => {
      const event: DeathEvent = {
        id: d.id,
        world: d.world,
        guild: d.guild,
        playerName: d.player_name,
        level: d.level,
        occurredAt: new Date(d.occurred_at),
        rawText: d.raw_text,
        hash: d.hash
      }
  
      // Só adiciona se existir valor
      if (d.created_at) {
        event.createdAt = new Date(d.created_at)
      }
      if (d.notified_at) {
        event.notifiedAt = new Date(d.notified_at)
      }
  
      return event
    })
  }

  async markAsNotified(ids: string[]): Promise<void> {
    const { error } = await this.client
      .from('death_events')
      .update({ notified_at: new Date().toISOString() })
      .in('id', ids)

    if (error) {
      throw new DatabaseError('Erro ao marcar mortes como notificadas', error)
    }
  }

  async getLastNotificationTime(): Promise<Date | null> {
    const { data } = await this.client
      .from('death_events')
      .select('notified_at')
      .not('notified_at', 'is', null)
      .order('notified_at', { ascending: false })
      .limit(1)
      .maybeSingle()
  
    if (!data?.notified_at) return null
    return new Date(data.notified_at)
  }
  


}
