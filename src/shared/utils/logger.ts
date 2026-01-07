/**
 * Sistema de logging estruturado com níveis e formatação.
 * Suporta diferentes níveis de log e pode ser facilmente integrado
 * com serviços externos (Sentry, Datadog, etc).
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private level: LogLevel
  private isDevelopment: boolean

  constructor() {
    // Define nível de log baseado na env var ou padrão INFO
    const envLevel = process.env.LOG_LEVEL?.toUpperCase() || 'INFO'
    this.level = LogLevel[envLevel as keyof typeof LogLevel] ?? LogLevel.INFO
    this.isDevelopment = process.env.NODE_ENV !== 'production'
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level
  }

  private formatTimestamp(): string {
    return new Date().toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  private formatMessage(level: string, message: string, data?: unknown): string {
    const timestamp = this.formatTimestamp()
    const prefix = `[${timestamp}] [${level}]`
    
    if (data !== undefined) {
      // Em desenvolvimento, mostra dados formatados
      if (this.isDevelopment) {
        return `${prefix} ${message}\n${JSON.stringify(data, null, 2)}`
      }
      // Em produção, mostra inline
      return `${prefix} ${message} ${JSON.stringify(data)}`
    }
    
    return `${prefix} ${message}`
  }

  debug(message: string, data?: unknown): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return
    console.debug(this.formatMessage('DEBUG', message, data))
  }

  info(message: string, data?: unknown): void {
    if (!this.shouldLog(LogLevel.INFO)) return
    console.info(this.formatMessage('INFO', message, data))
  }

  warn(message: string, data?: unknown): void {
    if (!this.shouldLog(LogLevel.WARN)) return
    console.warn(this.formatMessage('WARN', message, data))
  }

  error(message: string, error?: unknown): void {
    if (!this.shouldLog(LogLevel.ERROR)) return
    
    const timestamp = this.formatTimestamp()
    console.error(`[${timestamp}] [ERROR] ❌ ${message}`)
    
    if (error) {
      if (error instanceof Error) {
        console.error(`  └─ ${error.message}`)
        if (this.isDevelopment && error.stack) {
          console.error(error.stack)
        }
      } else {
        console.error('  └─', error)
      }
    }
  }

  /**
   * Log de sucesso (conveniente para operações importantes)
   */
  success(message: string, data?: unknown): void {
    if (!this.shouldLog(LogLevel.INFO)) return
    console.log(this.formatMessage('SUCCESS', `✅ ${message}`, data))
  }
}

// Singleton do logger
const logger = new Logger()

// Exporta funções para manter compatibilidade com código existente
export function log(message: string, data?: unknown): void {
  logger.info(message, data)
}

export function logError(message: string, error?: unknown): void {
  logger.error(message, error)
}

// Exporta logger completo para uso avançado
export { logger }