import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify'
import { ApiError } from '../errors/ApiError.js'
import { BusinessError } from '../../shared/errors/BusinessError.js'
import { DatabaseError } from '../../shared/errors/index.js'
import { logger } from '../../shared/utils/logger.js'

/**
 * Handler global de erros da API.
 * Converte erros internos em respostas HTTP apropriadas.
 */
export async function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Log do erro
  logger.error('❌ Erro na API:', {
    method: request.method,
    url: request.url,
    error: error.message,
    stack: error.stack
  })

  // ApiError (erros da API)
  if (error instanceof ApiError) {
    return reply.status(error.statusCode).send({
      success: false,
      error: {
        message: error.message,
        details: error.details
      }
    })
  }

  // BusinessError (regras de negócio)
  if (error instanceof BusinessError) {
    return reply.status(400).send({
      success: false,
      error: {
        message: error.message,
        details: (error as any).details
      }
    })
  }

  // BusinessError (regras de negócio)
  if (error instanceof BusinessError) {
    const businessError = error as BusinessError & { details?: any }
    return reply.status(400).send({
      success: false,
      error: {
        message: error.message,
        details: businessError.details
      }
    })
  }

  // DatabaseError
  if (error instanceof DatabaseError) {
    return reply.status(500).send({
      success: false,
      error: {
        message: 'Erro no banco de dados',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    })
  }

  // Erros de validação do Fastify
  if ((error as any).validation) {
    return reply.status(400).send({
      success: false,
      error: {
        message: 'Erro de validação',
        details: (error as any).validation
      }
    })
  }

  // Erro genérico
  return reply.status(error.statusCode || 500).send({
    success: false,
    error: {
      message: error.message || 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }
  })
}
