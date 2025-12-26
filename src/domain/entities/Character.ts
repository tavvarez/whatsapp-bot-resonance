export type CharacterType = 'MAIN' | 'MAKER'

export interface Character {
  id: number
  characterName: string
  phoneNumber: string
  type: CharacterType
}
