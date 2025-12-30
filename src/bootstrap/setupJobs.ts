/**
 * Setup dos jobs agendados da aplicação.
 */

import { FetchLatestDeathsJob } from '../app/jobs/FetchLatestDeathsJob.js'
import { NotifyDeathsJob } from '../app/jobs/NotifyDeathsJob.js'
import { TrackLevelUpsJob } from '../app/jobs/TrackLevelUpsJob.js'
import { container } from './container.js'
import { config } from '../config/index.js'
import { log, logError } from '../shared/utils/logger.js'

/**
 * Cria e retorna a função que executa os jobs de morte.
 */
export function createDeathJobsRunner() {
  const { deathRepository, deathScraper, whatsapp } = container

  const fetchJob = new FetchLatestDeathsJob(deathRepository, deathScraper)
  const notifyJob = new NotifyDeathsJob(deathRepository, whatsapp)

  return async function runDeathJobs(): Promise<void> {
    try {
      log('💀 Iniciando ciclo de mortes...')

      // 1. Busca novas mortes do site
      await fetchJob.execute({
        world: config.game.world,
        guild: config.game.guild
      })

      // 2. Notifica mortes pendentes
      await notifyJob.execute(config.whatsapp.groupIdNotifyDeaths)

      log('✅ Ciclo de mortes finalizado')
    } catch (error) {
      logError('❌ Erro no ciclo de mortes:', error)
    }
  }
}

/**
 * Cria e retorna a função que executa o job de level up.
 */
export function createLevelUpJobRunner() {
  const { huntedRepository, guildScraper, whatsapp } = container

  const trackJob = new TrackLevelUpsJob(huntedRepository, guildScraper, whatsapp)

  return async function runLevelUpJob(): Promise<void> {
    try {
      log('📊 Iniciando verificação de level ups...')

      await trackJob.execute({
        guild: config.game.guild,
        notifyTo: config.whatsapp.groupIdNotifyLevelUps
      })

      log('✅ Verificação de level ups finalizada')
    } catch (error) {
      logError('❌ Erro na verificação de level ups:', error)
    }
  }
}

/**
 * Inicia os jobs agendados.
 * Jobs rodam em intervalos diferentes para não sobrecarregar.
 */
export async function startScheduledJobs(): Promise<void> {
  const runDeathJobs = createDeathJobsRunner()
  const runLevelUpJob = createLevelUpJobRunner()

  // Executa jobs imediatamente (com delay entre eles)
  await runDeathJobs()
  
  // Delay de 30s antes de rodar o job de level up
  // Evita duas requisições simultâneas ao Rubinot
  setTimeout(async () => {
    await runLevelUpJob()
  }, 30000)

  // Agenda execuções periódicas
  setInterval(runDeathJobs, config.jobs.deathIntervalMs)
  setInterval(runLevelUpJob, config.jobs.levelUpIntervalMs)

  const deathMinutes = config.jobs.deathIntervalMs / 60000
  const levelUpMinutes = config.jobs.levelUpIntervalMs / 60000
  
  log(`⏰ Jobs agendados:`)
  log(`   └ Mortes: a cada ${deathMinutes} minutos`)
  log(`   └ Level ups: a cada ${levelUpMinutes} minutos`)
}
