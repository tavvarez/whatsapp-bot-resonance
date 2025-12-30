import type { Character, CharacterType } from '../entities/Character.js'

export interface CreateCharacterInput {
  characterName: string
  phoneNumber: string
  type: CharacterType
}

export interface CharacterRepository {
  findByNormalizedName(normalizedName: string): Promise<Character | null>
  save(input: CreateCharacterInput): Promise<Character>
  existsByName(normalizedName: string): Promise<boolean>
}
