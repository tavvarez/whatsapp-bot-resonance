import 'dotenv/config';
import { connectWhatsApp, setupCommands, setupBot, startScheduledJobs } from './bootstrap/index.js';
import { log, logError } from './shared/utils/logger.js';
async function main() {
    try {
        log('🚀 Iniciando aplicação...');
        // 1. Conecta ao WhatsApp
        await connectWhatsApp();
        // 2. Configura comandos
        const parser = setupCommands();
        // 3. Configura bot e listener
        const listener = setupBot(parser);
        // 4. Inicia jobs agendados
        await startScheduledJobs();
        // 5. Inicia listener de comandos
        listener.listen();
        log('✅ Aplicação iniciada com sucesso!');
    }
    catch (error) {
        logError('❌ Erro fatal ao iniciar aplicação:', error);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=index.js.map