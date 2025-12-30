import { describe, it, expect } from 'vitest'
import { normalizeText } from '../../shared/utils/normalizeText.js'

describe('normalizeText', () => {
  it('deve converter para minúsculas', () => {
    expect(normalizeText('FOXZINHO')).toBe('foxzinho')
  })

  it('deve remover acentos', () => {
    expect(normalizeText('Héléna Möréli')).toBe('helena moreli')
  })

  it('deve remover espaços extras', () => {
    expect(normalizeText('  Be   Na   Ti  ')).toBe('be na ti')
  })

  it('deve lidar com texto já normalizado', () => {
    expect(normalizeText('foxzinho')).toBe('foxzinho')
  })

  it('deve lidar com caracteres especiais de Tibia', () => {
    expect(normalizeText("Knight's Tale")).toBe("knight's tale")
  })

  it('deve lidar com string vazia', () => {
    expect(normalizeText('')).toBe('')
  })

  it('deve lidar com apenas espaços', () => {
    expect(normalizeText('   ')).toBe('')
  })
})

