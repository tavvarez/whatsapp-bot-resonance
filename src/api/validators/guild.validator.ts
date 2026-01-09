import { z } from 'zod'

/**
 * Schema de validação para adicionar uma guild.
 */
export const addGuildSchema = z.object({
  serverName: z.string().min(1, 'Servidor é obrigatório'),
  worldName: z.string().min(1, 'World é obrigatório'),
  guildName: z.string().min(1, 'Nome da guild é obrigatório'),
  notifyDeaths: z.boolean().optional().default(true),
  notifyLevelUps: z.boolean().optional().default(true),
  minLevelNotify: z.number().int().min(1).max(2000).optional().default(600)
})

/**
 * Schema de validação para atualizar uma guild.
 */
export const updateGuildSchema = z.object({
  notifyDeaths: z.boolean().optional(),
  notifyLevelUps: z.boolean().optional(),
  minLevelNotify: z.number().int().min(1).max(2000).optional()
})

export type AddGuildDTO = z.infer<typeof addGuildSchema>
export type UpdateGuildDTO = z.infer<typeof updateGuildSchema>
