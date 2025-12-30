import type { DeathRepository } from '../../domain/repositories/DeathRepository.js'
import type { DeathScraper } from '../../domain/scrapers/DeathScraper.js'
import { config } from '../../config/index.js'
import { log } from '../../shared/utils/logger.js'

interface FetchLatestDeathsJobParams {
  world: string
  guild: string
}

export class FetchLatestDeathsJob {
  constructor(
    private readonly deathRepository: DeathRepository,
    private readonly scraper: DeathScraper
  ) {}

  async execute({ world, guild }: FetchLatestDeathsJobParams): Promise<void> {
    log(`🔎 Buscando mortes... world=${world}, guild=${guild}`)
    
    const deaths = await this.scraper.fetch(
      { world, guild },
      { 
        maxRetries: config.scraper.maxRetries, 
        retryDelayMs: config.scraper.retryDelayMs 
      }
    )
    
    log(`🧾 ${deaths.length} mortes encontradas`)

    let consecutiveExisting = 0
    const threshold = config.jobs.duplicateThreshold

    for (const death of deaths) {
      const exists = await this.deathRepository.existsByHash(death.hash)
      
      if (exists) {
        consecutiveExisting++
        log(`⏭️ Já existe (${consecutiveExisting}/${threshold}): ${death.playerName}`)
        
        if (consecutiveExisting >= threshold) {
          log('🛑 Mortes já sincronizadas, pulando restante...')
          break
        }
        continue
      }

      // Reseta contador se encontrar uma morte nova
      consecutiveExisting = 0
      
      log(`💾 Salvando: ${death.playerName}`)
      await this.deathRepository.save(death)
    }
    
    log('✅ Job finalizado')
  }
}