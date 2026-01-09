import type { FastifyInstance } from 'fastify'
import { GuildController } from '../controllers/GuildController.js'
import { validateBody } from '../middlewares/validation.middleware.js'
import { addGuildSchema, updateGuildSchema, type AddGuildDTO, type UpdateGuildDTO } from '../validators/guild.validator.js'

/**
 * Rotas para gerenciamento de guilds monitoradas.
 */
export async function guildRoutes(fastify: FastifyInstance) {
  const controller = new GuildController()

  // GET /api/guilds - Lista todas as guilds
  fastify.get('/guilds', async (request, reply) => {
    return controller.list(request, reply)
  })

  // GET /api/guilds/:id - Busca guild por ID
  fastify.get<{ Params: { id: string } }>('/guilds/:id', async (request, reply) => {
    return controller.getById(request, reply)
  })

  // POST /api/guilds - Adiciona nova guild
  fastify.post<{ Body: AddGuildDTO }>('/guilds', {
    preHandler: validateBody(addGuildSchema)
  }, async (request, reply) => {
    return controller.create(request, reply)
  })

  // PATCH /api/guilds/:id - Atualiza guild
  fastify.patch<{ Params: { id: string }; Body: UpdateGuildDTO }>('/guilds/:id', {
    preHandler: validateBody(updateGuildSchema)
  }, async (request, reply) => {
    return controller.update(request, reply)
  })

  // DELETE /api/guilds/:id - Remove guild
  fastify.delete<{ Params: { id: string } }>('/guilds/:id', async (request, reply) => {
    return controller.delete(request, reply)
  })

  // POST /api/guilds/:id/activate - Reativa guild
  fastify.post<{ Params: { id: string } }>('/guilds/:id/activate', async (request, reply) => {
    return controller.activate(request, reply)
  })
}
