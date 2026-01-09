import type { FastifyInstance } from 'fastify'

/**
 * Rotas de health check.
 */
export async function healthRoutes(fastify: FastifyInstance) {
  // GET /api/health - Health check
  fastify.get('/health', async (request, reply) => {
    return reply.status(200).send({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
      }
    })
  })
}
