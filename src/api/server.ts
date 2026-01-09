import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { registerRoutes } from './routes/index.js'
import { errorHandler } from './middlewares/errorHandler.middleware.js'
import { authMiddleware } from './middlewares/auth.middleware.js'
import { logger } from '../shared/utils/logger.js'

/**
 * Cria e configura o servidor da API.
 */
export async function createApiServer() {
  const fastify = Fastify({
    logger: false, // Usa nosso logger customizado
    trustProxy: true,
    disableRequestLogging: true
  })

  // ==================== PLUGINS ====================

  // CORS
  await fastify.register(cors, {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  })

  // Helmet (segurança)
  await fastify.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })

  // Rate limiting
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '15 minutes',
    errorResponseBuilder: () => ({
      success: false,
      error: {
        message: 'Muitas requisições. Tente novamente mais tarde.',
        statusCode: 429
      }
    })
  })

  // ==================== HOOKS ====================

  // Log de requisições
  fastify.addHook('onRequest', async (request, reply) => {
    logger.debug(`📨 ${request.method} ${request.url}`)
  })

  // Log de respostas
  fastify.addHook('onResponse', async (request, reply) => {
    logger.debug(`📤 ${request.method} ${request.url} - ${reply.statusCode}`)
  })

  // Middleware de autenticação
  fastify.addHook('onRequest', authMiddleware)

  // ==================== ROTAS ====================

  // Rota raiz
  fastify.get('/', async (request, reply) => {
    return reply.status(200).send({
      success: true,
      message: 'WhatsApp Bot Resonance API',
      version: '1.0.0',
      docs: '/docs'
    })
  })

  // Registra todas as rotas
  await registerRoutes(fastify)

  // ==================== ERROR HANDLER ====================

  fastify.setErrorHandler(errorHandler)

  return fastify
}

/**
 * Inicia o servidor da API.
 */
export async function startApiServer() {
  try {
    const server = await createApiServer()

    // Railway usa a variável PORT automaticamente
    // Se não existir, usa API_PORT ou 3001 como fallback
    const port = Number(process.env.PORT) || Number(process.env.API_PORT) || 3001
    const host = process.env.API_HOST || '0.0.0.0'

    await server.listen({ port, host })

    logger.info(`🌐 API Server rodando em http://${host}:${port}`)
    logger.info(`📚 Health check: http://${host}:${port}/api/health`)
    logger.info(`🔑 Token de autenticação configurado`)
    
    // Log adicional para Railway
    if (process.env.RAILWAY_ENVIRONMENT) {
      logger.info(`🚂 Rodando no Railway (${process.env.RAILWAY_ENVIRONMENT})`)
      logger.info(`🌍 URL pública: ${process.env.RAILWAY_PUBLIC_DOMAIN || 'Aguardando...'}`)
    }

    return server
  } catch (error) {
    logger.error('❌ Erro ao iniciar API Server:', error)
    throw error
  }
}
