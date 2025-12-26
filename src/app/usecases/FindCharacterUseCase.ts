import type { CharacterRepository } from '../../domain/repositories/CharacterRepository.js'

export class FindCharacterUseCase {
  constructor(private repository: CharacterRepository) {}

  async execute(characterName: string) {
    const normalizedName = this.normalize(characterName)
    return this.repository.findByNormalizedName(normalizedName)
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove acentos
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
  }
}
