import 'dotenv/config'

import { startWhatsAppBot } from './bot.js'
import { startApiServer } from './api/server.js'
import { log, logError } from './shared/utils/logger.js'
import { browserPool } from './infra/scraper/BrowserPool.js'

// ==================== HANDLERS DE ERRO GLOBAIS ====================
// Captura erros não tratados para evitar que o processo morra silenciosamente

process.on('unhandledRejection', (reason, promise) => {
  logError('❌ Unhandled Rejection detectada:', reason)
  logError('Promise:', promise)
  // NÃO encerra o processo, apenas loga o erro
})

process.on('uncaughtException', (error) => {
  logError('❌ Uncaught Exception detectada:', error)
  logError('Stack:', error.stack)
  // NÃO encerra o processo, apenas loga o erro
})

process.on('SIGINT', async () => {
  log('🛑 Recebido SIGINT, encerrando gracefully...')
  try {
    await browserPool.shutdown()
    log('✅ Browser pool fechado')
  } catch (error) {
    logError('Erro ao fechar browser pool:', error)
  }
  process.exit(0)
})

process.on('SIGTERM', async () => {
  log('🛑 Recebido SIGTERM, encerrando gracefully...')
  try {
    await browserPool.shutdown()
    log('✅ Browser pool fechado')
  } catch (error) {
    logError('Erro ao fechar browser pool:', error)
  }
  process.exit(0)
})

// ================================================================

async function main() {
  try {
    log('🚀 Iniciando aplicação completa...')
    log(`📅 Data/Hora: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`)

    // 1. Inicia o Bot do WhatsApp
    await startWhatsAppBot()

    // 2. Inicia a API REST (se habilitada)
    const apiEnabled = process.env.API_ENABLED !== 'false' // Padrão: habilitada
    if (apiEnabled) {
      await startApiServer()
    } else {
      log('ℹ️ API desabilitada (API_ENABLED=false)')
    }

    log('✅ Sistema completo iniciado com sucesso!')
    log(`📊 Componentes ativos:`)
    log(`   ├─ Bot WhatsApp: ✅`)
    log(`   ├─ API REST: ${apiEnabled ? '✅' : '❌'}`)
    log(`   ├─ Jobs: ✅`)
    log(`   └─ Browser Pool: ✅`)
  } catch (error) {
    logError('❌ Erro fatal ao iniciar aplicação:', error)
    process.exit(1)
  }
}

main()
