import type { FastifyInstance } from 'fastify'
import { healthRoutes } from './health.routes.js'
import { guildRoutes } from './guild.routes.js'

/**
 * Registra todas as rotas da API.
 */
export async function registerRoutes(fastify: FastifyInstance) {
  // Prefixo /api para todas as rotas
  await fastify.register(async (api) => {
    // Rotas públicas
    await api.register(healthRoutes)

    // Rotas protegidas
    await api.register(guildRoutes)

    // TODO: Adicionar mais rotas conforme necessário
    // await api.register(characterRoutes)
    // await api.register(dashboardRoutes)
    // await api.register(serverRoutes)
  }, { prefix: '/api' })
}
