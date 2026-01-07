import type { SupabaseClient } from '@supabase/supabase-js'
import type { HuntedRepository, CreateHuntedInput, UpdateLevelInput } from '../../domain/repositories/HuntedRepository.js'
import type { Hunted } from '../../domain/entities/Hunted.js'
import { DatabaseError } from '../../shared/errors/index.js'
import { normalizeText } from '../../shared/utils/normalizeText.js'
import { getSupabaseClient } from './SupabaseClient.js'

export class SupabaseHuntedRepository implements HuntedRepository {
  private client: SupabaseClient

  constructor() {
    this.client = getSupabaseClient()
  }

  private getTodayDateString(): string {
    return new Date().toISOString().split('T')[0]!
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.toISOString().split('T')[0] === date2.toISOString().split('T')[0]
  }

  async findActiveByGuild(guild: string): Promise<Hunted[]> {
    const { data, error } = await this.client
      .from('hunteds')
      .select('*')
      .eq('guild', guild)
      .eq('is_active', true)

    if (error) {
      throw new DatabaseError('Erro ao buscar hunteds da guild', error)
    }

    return (data ?? []).map(d => this.mapToEntity(d))
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
        is_active: true,
        level_gain_today: 0,
        last_level_up_date: null
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
    const now = new Date()
    const todayStr = this.getTodayDateString()

    // Primeiro, busca o hunted para verificar se é o mesmo dia
    const hunted = await this.findByName(input.nameNormalized)
    
    if (!hunted) return

    // Calcula o novo level_gain_today
    let newLevelGainToday: number

    if (hunted.lastLevelUpDate && this.isSameDay(hunted.lastLevelUpDate, now)) {
      // Mesmo dia: incrementa
      newLevelGainToday = hunted.levelGainToday + input.levelsGained
    } else {
      // Novo dia: reseta e começa do zero
      newLevelGainToday = input.levelsGained
    }

    const { error } = await this.client
      .from('hunteds')
      .update({
        last_known_level: input.newLevel,
        level_gain_today: newLevelGainToday,
        last_level_up_date: todayStr,
        updated_at: now.toISOString()
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
      isActive: data.is_active as boolean,
      levelGainToday: (data.level_gain_today as number) ?? 0
    }

    if (data.vocation) {
      entity.vocation = data.vocation as string
    }
    if (data.last_level_up_date) {
      entity.lastLevelUpDate = new Date(data.last_level_up_date as string)
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
