import 'dotenv/config'

import { 
  connectWhatsApp, 
  setupCommands, 
  setupBot, 
  startScheduledJobs 
} from './bootstrap/index.js'
import { log, logError } from './shared/utils/logger.js'
import { browserPool } from './infra/scraper/BrowserPool.js'

async function main() {
  try {
    log('🚀 Iniciando aplicação...')

    await browserPool.initialize()
    log('✅ Browser pool inicializado')

    // 1. Conecta ao WhatsApp
    await connectWhatsApp()

    // 2. Configura comandos
    const parser = setupCommands()

    // 3. Configura bot e listener
    const listener = setupBot(parser)

    // 4. Inicia jobs agendados
    await startScheduledJobs()

    // 5. Inicia listener de comandos
    listener.listen()

    log('✅ Aplicação iniciada com sucesso!')
    
    process.on('SIGTERM', async () => {
      log('🛑 Recebido SIGTERM, encerrando...')
      await browserPool.shutdown()
      process.exit(0)
    })

    process.on('SIGINT', async () => {
      log('🛑 Recebido SIGINT, encerrando...')
      await browserPool.shutdown()
      process.exit(0)
    })    
  } catch (error) {
    logError('❌ Erro fatal ao iniciar aplicação:', error)
    process.exit(1)
  }
}

main()
