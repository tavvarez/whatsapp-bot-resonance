/**
 * Módulo do Bot do WhatsApp.
 * Isolado para poder ser iniciado independentemente da API.
 */

import { 
  connectWhatsApp, 
  setupCommands, 
  setupBot, 
  startScheduledJobs 
} from './bootstrap/index.js'
import { log, logError } from './shared/utils/logger.js'
import { browserPool } from './infra/scraper/BrowserPool.js'

/**
 * Inicia o bot do WhatsApp.
 */
export async function startWhatsAppBot() {
  try {
    log('🤖 Iniciando Bot do WhatsApp...')

    // 1. Inicializa browser pool
    await browserPool.initialize()
    log('✅ Browser pool inicializado')

    // 2. Conecta ao WhatsApp
    await connectWhatsApp()

    // 3. Configura comandos
    const parser = setupCommands()

    // 4. Configura bot e listener (carrega cache de grupos)
    const listener = await setupBot(parser)

    // 5. Inicia jobs agendados
    await startScheduledJobs()

    // 6. Inicia listener de comandos
    listener.listen()

    log('✅ Bot do WhatsApp iniciado com sucesso!')
    log('🎧 Aguardando mensagens...')

    // Heartbeat a cada 1 hora
    setInterval(() => {
      log(`💓 Heartbeat Bot: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`)
    }, 60 * 60 * 1000)

    return listener
  } catch (error) {
    logError('❌ Erro ao iniciar Bot do WhatsApp:', error)
    throw error
  }
}
