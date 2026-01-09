/**
 * Erro de regra de negócio.
 * Usado nos use cases quando uma regra de negócio é violada.
 */
export class BusinessError extends Error {
  constructor(message: string, public details?: any) {
    super(message)
    this.name = 'BusinessError'
    Error.captureStackTrace(this, this.constructor)
  }
}
