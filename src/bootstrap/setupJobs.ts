/**
 * Setup dos jobs agendados da aplicação.
 */

import { FetchLatestDeathsJob } from '../app/jobs/FetchLatestDeathsJob.js'
import { NotifyDeathsJob } from '../app/jobs/NotifyDeathsJob.js'
import { TrackLevelUpsJob } from '../app/jobs/TrackLevelUpsJob.js'
import { container } from './container.js'
import { config } from '../config/index.js'
import { log, logError } from '../shared/utils/logger.js'
import { CloudflareBlockedError } from '../shared/errors/index.js'

/**
 * Adiciona jitter aleatório ao intervalo para evitar padrões detectáveis
 */
function addJitter(baseIntervalMs: number): number {
  const jitter = Math.random() * config.jobs.intervalJitterMs
  return baseIntervalMs + jitter
}

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
      if (error instanceof CloudflareBlockedError) {
        const cooldownMinutes = config.scraper.cloudflareCooldownMs / 60000
        logError(`🛡️ Cloudflare bloqueou o scraper de mortes. Pausando por ${cooldownMinutes} minutos antes de tentar novamente.`, error)
        
        // Agenda próxima execução após cooldown
        setTimeout(() => {
          runDeathJobs()
        }, config.scraper.cloudflareCooldownMs)
        
        // Agenda execução periódica normal após o cooldown
        setTimeout(() => {
          scheduleDeathJobs()
        }, config.scraper.cloudflareCooldownMs)
        
        return // Não relança o erro, apenas pausa
      }
      
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
      if (error instanceof CloudflareBlockedError) {
        const cooldownMinutes = config.scraper.cloudflareCooldownMs / 60000
        logError(`🛡️ Cloudflare bloqueou o scraper de level ups. Pausando por ${cooldownMinutes} minutos antes de tentar novamente.`, error)
        
        // Agenda próxima execução após cooldown
        setTimeout(() => {
          runLevelUpJob()
        }, config.scraper.cloudflareCooldownMs)
        
        // Agenda execução periódica normal após o cooldown
        setTimeout(() => {
          scheduleLevelUpJobs()
        }, config.scraper.cloudflareCooldownMs)
        
        return // Não relança o erro, apenas pausa
      }
      
      logError('❌ Erro na verificação de level ups:', error)
    }
  }
}

/**
 * Agenda execuções periódicas do job de mortes com jitter
 */
function scheduleDeathJobs(): void {
  const runDeathJobs = createDeathJobsRunner()
  
  function scheduleNext(): void {
    const intervalWithJitter = addJitter(config.jobs.deathIntervalMs)
    const intervalMinutes = Math.round(intervalWithJitter / 60000)
    
    log(`⏰ Próxima execução de mortes em ~${intervalMinutes} minutos`)
    
    setTimeout(() => {
      runDeathJobs().finally(() => {
        scheduleNext() // Agenda próxima execução após terminar
      })
    }, intervalWithJitter)
  }
  
  scheduleNext()
}

/**
 * Agenda execuções periódicas do job de level ups com jitter
 */
function scheduleLevelUpJobs(): void {
  const runLevelUpJob = createLevelUpJobRunner()
  
  function scheduleNext(): void {
    const intervalWithJitter = addJitter(config.jobs.levelUpIntervalMs)
    const intervalMinutes = Math.round(intervalWithJitter / 60000)
    
    log(`⏰ Próxima execução de level ups em ~${intervalMinutes} minutos`)
    
    setTimeout(() => {
      runLevelUpJob().finally(() => {
        scheduleNext() // Agenda próxima execução após terminar
      })
    }, intervalWithJitter)
  }
  
  scheduleNext()
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
  
  // Delay aumentado para 3 minutos antes de rodar o job de level up
  // Evita duas requisições simultâneas ao Rubinot
  setTimeout(async () => {
    await runLevelUpJob()
  }, 180000) // 3 minutos

  // Inicia agendamento periódico com jitter
  scheduleDeathJobs()
  scheduleLevelUpJobs()

  const deathMinutes = config.jobs.deathIntervalMs / 60000
  const levelUpMinutes = config.jobs.levelUpIntervalMs / 60000
  
  log(`⏰ Jobs agendados:`)
  log(`   └ Mortes: a cada ~${deathMinutes} minutos (com jitter de até ${config.jobs.intervalJitterMs / 60000} min)`)
  log(`   └ Level ups: a cada ~${levelUpMinutes} minutos (com jitter de até ${config.jobs.intervalJitterMs / 60000} min)`)
}