import type { DeathRepository } from '../../domain/repositories/DeathRepository.js'
import { RubinotDeathScraper } from '../../infra/scraper/RubinotDeathScraper.js'

interface FetchLatestDeathsJobParams {
  world: string
  guild: string
}

export class FetchLatestDeathsJob {
  constructor(
    private readonly deathRepository: DeathRepository,
    private readonly scraper: RubinotDeathScraper
  ) {}

  async execute({ world, guild }: FetchLatestDeathsJobParams): Promise<void> {
    console.log('🔎 Buscando mortes...', { world, guild })
    const deaths = await this.scraper.fetch({ world, guild })
    console.log(`🧾 ${deaths.length} mortes encontradas`)

    let consecutiveExisting = 0
    const threshold = 2 // Se 2 primeiras já existem, para

    for (const death of deaths) {
      const exists = await this.deathRepository.existsByHash(death.hash)
      
      if (exists) {
        consecutiveExisting++
        console.log(`⏭️ Já existe (${consecutiveExisting}/${threshold}):`, death.playerName)
        
        if (consecutiveExisting >= threshold) {
          console.log('🛑 Mortes já sincronizadas, pulando restante...')
          break
        }
        continue
      }

      // Reseta contador se encontrar uma morte nova
      consecutiveExisting = 0
      
      console.log('💾 Salvando:', death.playerName)
      await this.deathRepository.save(death)
    }
    
    console.log('✅ Job finalizado')
  }
}