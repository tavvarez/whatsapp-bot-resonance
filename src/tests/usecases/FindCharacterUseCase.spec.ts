import { describe, it, expect } from 'vitest'
import { FindCharacterUseCase } from '../../app/usecases/FindCharacterUseCase.js'

const fakeRepo = {
  findByName: async () => ({
    id: 1,
    characterName: 'Test',
    phoneNumber: '559999999'
  })
}

describe('FindCharacterUseCase', () => {
  it('should find a character', async () => {
    const usecase = new FindCharacterUseCase(fakeRepo as any)
    const result = await usecase.execute('Test')

    expect(result?.characterName).toBe('Test')
  })
})
