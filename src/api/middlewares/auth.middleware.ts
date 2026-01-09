import type { FastifyRequest, FastifyReply } from 'fastify'
import { ApiError } from '../errors/ApiError.js'
import { logger } from '../../shared/utils/logger.js'

// Rotas públicas que não precisam de autenticação
const PUBLIC_ROUTES = [
  '/api/health',
  '/api/auth/login',
  '/docs',
  '/documentation'
]

/**
 * Middleware de autenticação.
 * Verifica se a requisição tem um token válido.
 * 
 * TODO: Implementar JWT quando tiver sistema de autenticação.
 * Por enquanto, usa um token simples do .env para testes.
 */
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Pula autenticação para rotas públicas
  const isPublicRoute = PUBLIC_ROUTES.some(route => 
    request.url.startsWith(route)
  )

  if (isPublicRoute) {
    return
  }

  // Verifica token no header
  const authHeader = request.headers.authorization
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    throw new ApiError('Token não fornecido', 401)
  }

  // TODO: Implementar validação JWT real
  // Por enquanto, aceita qualquer token que seja igual ao API_TOKEN do .env
  const validToken = process.env.API_TOKEN || 'dev-token-123'

  if (token !== validToken) {
    throw new ApiError('Token inválido', 401)
  }

  // TODO: Adicionar informações do usuário ao request
  // request.user = { id, tenantId, role }
  
  logger.debug(`✅ Requisição autenticada: ${request.method} ${request.url}`)
}

// Declaração de tipos para o Fastify
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string
      tenantId: string
      role: 'admin' | 'member'
    }
  }
}
