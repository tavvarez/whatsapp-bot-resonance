import type { FastifyRequest, FastifyReply } from 'fastify'
import type { ZodSchema } from 'zod'
import { ApiError } from '../errors/ApiError.js'

/**
 * Middleware de validação usando Zod.
 * Valida o body da requisição contra um schema.
 */
export function validateBody(schema: ZodSchema) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.body = schema.parse(request.body)
    } catch (error: any) {
      throw new ApiError('Erro de validação', 400, error.errors)
    }
  }
}

/**
 * Middleware de validação para params.
 */
export function validateParams(schema: ZodSchema) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.params = schema.parse(request.params)
    } catch (error: any) {
      throw new ApiError('Erro de validação nos parâmetros', 400, error.errors)
    }
  }
}

/**
 * Middleware de validação para query.
 */
export function validateQuery(schema: ZodSchema) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      request.query = schema.parse(request.query)
    } catch (error: any) {
      throw new ApiError('Erro de validação na query', 400, error.errors)
    }
  }
}
