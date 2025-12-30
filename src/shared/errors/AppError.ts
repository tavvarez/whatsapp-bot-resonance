/**
 * Classe base para todos os erros da aplicação.
 * Permite identificar erros tratáveis vs erros inesperados.
 */
export class AppError extends Error {
  public readonly isOperational: boolean
  public code: string

  constructor(message: string, code: string, isOperational = true) {
    super(message)
    this.code = code
    this.isOperational = isOperational
    this.name = this.constructor.name

    // Mantém stack trace correto em V8 (Node.js)
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * Erro de configuração - variável de ambiente ausente ou inválida
 */
export class ConfigError extends AppError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR')
  }
}

/**
 * Erro de banco de dados - falha em operações do Supabase
 */
export class DatabaseError extends AppError {
  public readonly originalError?: unknown

  constructor(message: string, originalError?: unknown) {
    super(message, 'DATABASE_ERROR')
    this.originalError = originalError
  }
}

/**
 * Erro de scraping - problemas ao extrair dados do site
 */
export class ScraperError extends AppError {
  public readonly originalError?: unknown

  constructor(message: string, originalError?: unknown) {
    super(message, 'SCRAPER_ERROR')
    this.originalError = originalError
  }
}

/**
 * Erro de Cloudflare - bloqueado pelo sistema anti-bot
 */
export class CloudflareBlockedError extends ScraperError {
  constructor() {
    super('Cloudflare bloqueou todas as tentativas de acesso')
    this.code = 'CLOUDFLARE_BLOCKED'
  }
}

/**
 * Erro de parsing - formato de dados inesperado
 */
export class ParseError extends AppError {
  public readonly rawData: string

  constructor(message: string, rawData: string) {
    super(message, 'PARSE_ERROR')
    this.rawData = rawData
  }
}

/**
 * Erro de WhatsApp - falha na conexão ou envio de mensagens
 */
export class WhatsAppError extends AppError {
  public readonly originalError?: unknown

  constructor(message: string, originalError?: unknown) {
    super(message, 'WHATSAPP_ERROR')
    this.originalError = originalError
  }
}

/**
 * Erro de entidade não encontrada
 */
export class NotFoundError extends AppError {
  public readonly entity: string
  public readonly identifier: string

  constructor(entity: string, identifier: string) {
    super(`${entity} não encontrado: ${identifier}`, 'NOT_FOUND')
    this.entity = entity
    this.identifier = identifier
  }
}

