import { z } from 'zod'

/**
 * Schema de validação para adicionar um character.
 */
export const addCharacterSchema = z.object({
  characterName: z.string().min(1, 'Nome do character é obrigatório'),
  phoneNumber: z.string().regex(/^\d{10,13}$/, 'Telefone inválido (10-13 dígitos)').optional(),
  type: z.enum(['MAIN', 'MAKER'], {
    message: 'Tipo deve ser MAIN ou MAKER'
  })
})

/**
 * Schema de validação para atualizar um character.
 */
export const updateCharacterSchema = z.object({
  characterName: z.string().min(1).optional(),
  phoneNumber: z.string().regex(/^\d{10,13}$/).optional(),
  type: z.enum(['MAIN', 'MAKER']).optional()
})

export type AddCharacterDTO = z.infer<typeof addCharacterSchema>
export type UpdateCharacterDTO = z.infer<typeof updateCharacterSchema>
