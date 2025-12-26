import type { Character } from '../entities/Character.js'

export interface CharacterRepository {
  findByNormalizedName(normalizedName: string): Promise<Character | null>
}
