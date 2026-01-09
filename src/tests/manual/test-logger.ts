/**
 * Teste manual do sistema de logging
 * Execute: npx ts-node src/tests/manual/test-logger.ts
 */

import { logger } from '../../shared/utils/logger.js'

console.log('='.repeat(60))
console.log('🧪 TESTANDO SISTEMA DE LOGGING')
console.log('='.repeat(60))
console.log()

// Teste 1: Níveis de log
console.log('📝 Teste 1: Diferentes níveis de log')
console.log('-'.repeat(60))
logger.debug('Mensagem de DEBUG - só aparece se LOG_LEVEL=debug')
logger.info('Mensagem de INFO - operação normal')
logger.warn('Mensagem de WARN - algo inesperado')
logger.error('Mensagem de ERROR - erro crítico')
logger.success('Mensagem de SUCCESS - operação bem-sucedida')
console.log()

// Teste 2: Log com dados estruturados
console.log('📝 Teste 2: Logs com dados estruturados')
console.log('-'.repeat(60))
logger.info('Usuário logou', { userId: 123, username: 'tavvarez' })
logger.debug('Dados da requisição', {
  method: 'POST',
  url: '/api/deaths',
  body: { world: 'Rubinot', guild: 'Test' }
})
console.log()

// Teste 3: Log de erro com stack trace
console.log('📝 Teste 3: Erro com stack trace')
console.log('-'.repeat(60))
try {
  throw new Error('Erro de teste simulado')
} catch (error) {
  logger.error('Falha ao processar requisição', error)
}
console.log()

// Teste 4: Log de erro customizado
console.log('📝 Teste 4: Erro customizado')
console.log('-'.repeat(60))
class CustomError extends Error {
  code: string
  constructor(message: string, code: string) {
    super(message)
    this.name = 'CustomError'
    this.code = code
  }
}

try {
  throw new CustomError('Erro customizado', 'CUSTOM_001')
} catch (error) {
  logger.error('Erro customizado capturado', error)
}
console.log()

// Teste 5: Diferentes formatos de dados
console.log('📝 Teste 5: Diferentes formatos de dados')
console.log('-'.repeat(60))
logger.info('Array de dados', [1, 2, 3, 4, 5])
logger.info('Objeto complexo', {
  nested: {
    level: 1,
    data: {
      level: 2,
      items: ['a', 'b', 'c']
    }
  }
})
console.log()

console.log('='.repeat(60))
console.log('✅ TESTES CONCLUÍDOS')
console.log('='.repeat(60))
console.log()
console.log('💡 Dicas:')
console.log('  - Para ver logs DEBUG: LOG_LEVEL=debug npx ts-node src/tests/manual/test-logger.ts')
console.log('  - Para ver apenas WARN+: LOG_LEVEL=warn npx ts-node src/tests/manual/test-logger.ts')
console.log('  - Para ver apenas ERROR: LOG_LEVEL=error npx ts-node src/tests/manual/test-logger.ts')

