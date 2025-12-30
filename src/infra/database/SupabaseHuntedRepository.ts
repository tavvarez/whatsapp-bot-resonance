import { createClient } from '@supabase/supabase-js'
import type { HuntedRepository, CreateHuntedInput, UpdateLevelInput } from '../../domain/repositories/HuntedRepository.js'
import type { Hunted } from '../../domain/entities/Hunted.js'
import { DatabaseError } from '../../shared/errors/index.js'
import { normalizeText } from '../../shared/utils/normalizeText.js'

export class SupabaseHuntedRepository implements HuntedRepository {
  private client = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  async findActiveByGuild(guild: string): Promise<Hunted[]> {
    const { data, error } = await this.client
      .from('hunteds')
      .select('*')
      .eq('guild', guild)
      .eq('is_active', true)

    if (error) {
      throw new DatabaseError('Erro ao buscar hunteds da guild', error)
    }

    return (data ?? []).map(this.mapToEntity)
  }

  async findByName(nameNormalized: string): Promise<Hunted | null> {
    const { data, error } = await this.client
      .from('hunteds')
      .select('*')
      .eq('name_normalized', nameNormalized)
      .maybeSingle()

    if (error) {
      throw new DatabaseError('Erro ao buscar hunted', error)
    }

    return data ? this.mapToEntity(data) : null
  }

  async existsByName(nameNormalized: string): Promise<boolean> {
    const { data } = await this.client
      .from('hunteds')
      .select('id')
      .eq('name_normalized', nameNormalized)
      .maybeSingle()

    return !!data
  }

  async save(input: CreateHuntedInput): Promise<Hunted> {
    const nameNormalized = normalizeText(input.playerName)

    const { data, error } = await this.client
      .from('hunteds')
      .upsert({
        player_name: input.playerName,
        name_normalized: nameNormalized,
        last_known_level: input.level,
        vocation: input.vocation,
        guild: input.guild,
        is_active: true
      }, {
        onConflict: 'name_normalized'
      })
      .select()
      .single()

    if (error) {
      throw new DatabaseError('Erro ao salvar hunted', error)
    }

    return this.mapToEntity(data)
  }

  async updateLevel(input: UpdateLevelInput): Promise<void> {
    const { error } = await this.client
      .from('hunteds')
      .update({
        last_known_level: input.newLevel,
        updated_at: new Date().toISOString()
      })
      .eq('name_normalized', input.nameNormalized)

    if (error) {
      throw new DatabaseError('Erro ao atualizar level do hunted', error)
    }
  }

  async batchUpdateLevels(updates: UpdateLevelInput[]): Promise<void> {
    // Supabase não suporta batch update nativo, então usamos Promise.all
    // com chunks para não sobrecarregar
    const chunkSize = 10
    
    for (let i = 0; i < updates.length; i += chunkSize) {
      const chunk = updates.slice(i, i + chunkSize)
      
      await Promise.all(
        chunk.map(update => this.updateLevel(update))
      )
    }
  }

  async deactivate(nameNormalized: string): Promise<void> {
    const { error } = await this.client
      .from('hunteds')
      .update({ is_active: false })
      .eq('name_normalized', nameNormalized)

    if (error) {
      throw new DatabaseError('Erro ao desativar hunted', error)
    }
  }

  private mapToEntity(data: Record<string, unknown>): Hunted {
    const entity: Hunted = {
      id: data.id as string,
      playerName: data.player_name as string,
      nameNormalized: data.name_normalized as string,
      lastKnownLevel: data.last_known_level as number,
      guild: data.guild as string,
      isActive: data.is_active as boolean
    }

    if (data.vocation) {
      entity.vocation = data.vocation as string
    }
    if (data.created_at) {
      entity.createdAt = new Date(data.created_at as string)
    }
    if (data.updated_at) {
      entity.updatedAt = new Date(data.updated_at as string)
    }

    return entity
  }
}

