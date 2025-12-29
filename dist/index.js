import 'dotenv/config';
import { BaileysClient } from './infra/whatsapp/BaileysClient.js';
import { SupabaseCharacterRepository } from './infra/database/SupabaseCharacterRepository.js';
import { FindCharacterUseCase } from './app/usecases/FindCharacterUseCase.js';
import { FindCharacterCommand } from './app/commands/FindCharacterCommand.js';
import { CommandParser } from './app/commands/CommandParser.js';
import { GroupGuard } from './app/bot/GroupGuard.js';
import { MessageListener } from './app/bot/MessageListener.js';
import { NotifyDeathsJob } from './app/jobs/NotifyDeathsJob.js';
import { FetchLatestDeathsJob } from './app/jobs/FetchLatestDeathsJob.js';
import { SupabaseDeathRepository } from './infra/database/SupabaseDeathRepository.js';
import { RubinotDeathScraper } from './infra/scraper/RubinotDeathScraper.js';
const whatsapp = new BaileysClient();
await whatsapp.connect();
// Comandos
const repository = new SupabaseCharacterRepository();
const useCase = new FindCharacterUseCase(repository);
const command = new FindCharacterCommand(useCase, whatsapp);
const parser = new CommandParser(command);
const guard = new GroupGuard(process.env.GROUP_ID);
const listener = new MessageListener(whatsapp, guard, parser);
// Debug: mostra ID dos grupos
whatsapp.onMessage((msg) => {
    const jid = msg.key.remoteJid;
    if (jid?.endsWith('@g.us')) {
        console.log('📌 GROUP ID:', jid);
    }
});
// Jobs de mortes
const deathRepo = new SupabaseDeathRepository();
const scraper = new RubinotDeathScraper();
const fetchJob = new FetchLatestDeathsJob(deathRepo, scraper);
const notifyJob = new NotifyDeathsJob(deathRepo, whatsapp);
// Função que executa os jobs
async function runDeathJobs() {
    try {
        console.log('🔄 Iniciando ciclo de jobs...');
        // 1. Busca novas mortes do site
        await fetchJob.execute({
            world: process.env.WORLD,
            guild: process.env.GUILD
        });
        // 2. Notifica mortes pendentes
        await notifyJob.execute(process.env.GROUP_ID_NOTIFY);
        console.log('✅ Ciclo finalizado');
    }
    catch (error) {
        console.error('❌ Erro no ciclo de jobs:', error);
    }
}
// Executa imediatamente
await runDeathJobs();
// Executa a cada 5 minutos (300000ms)
const INTERVAL_MS = 5 * 60 * 1000;
setInterval(runDeathJobs, INTERVAL_MS);
console.log(`⏰ Jobs agendados para rodar a cada ${INTERVAL_MS / 60000} minutos`);
// Inicia o listener de comandos
listener.listen();
//# sourceMappingURL=index.js.map