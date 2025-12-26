import { createClient } from '@supabase/supabase-js'
import type { CharacterRepository } from '../../domain/repositories/CharacterRepository.js'
import type { Character } from '../../domain/entities/Character.js'

export class SupabaseCharacterRepository implements CharacterRepository {
  private client = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  async findByNormalizedName(normalizedName: string): Promise<Character | null> {
    const { data, error } = await this.client
      .from('characters')
      .select('*')
      .eq('name_normalized', normalizedName)
      .single()

    if (error || !data) return null

    return {
      id: data.id,
      characterName: data.character_name,
      phoneNumber: data.phone_number,
      type: data.character_type
    }
  }
}
