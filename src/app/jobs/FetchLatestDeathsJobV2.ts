import type { DeathRepository } from '../../domain/repositories/DeathRepository.js'
import type { HuntedGuildRepository } from '../../domain/repositories/HuntedGuildRepository.js'
import type { GameWorldRepository } from '../../domain/repositories/GameWorldRepository.js'
import type { GameServerRepository } from '../../domain/repositories/GameServerRepository.js'
import { ScraperFactory } from '../../infra/scraper/ScraperFactory.js'
import { config } from '../../config/index.js'
import { logger } from '../../shared/utils/logger.js'

/**
 * Job V2 para buscar mortes de múltiplas guilds (multi-tenancy).
 * Itera por todas as hunted_guilds ativas e faz scraping das mortes.
 */
export class FetchLatestDeathsJobV2 {
  constructor(
    private readonly deathRepository: DeathRepository,
    private readonly huntedGuildRepository: HuntedGuildRepository,
    private readonly gameWorldRepository: GameWorldRepository,
    private readonly gameServerRepository: GameServerRepository
  ) {}

  async execute(): Promise<void> {
    logger.info('💀 [JobV2] Iniciando busca de mortes multi-tenancy...')

    // 1. Busca todas as hunted guilds ativas que querem notificações de morte
    const huntedGuilds = await this.huntedGuildRepository.listAllActive()
    const guildsToProcess = huntedGuilds.filter(hg => hg.notifyDeaths)

    if (guildsToProcess.length === 0) {
      logger.info('⚠️ Nenhuma guild configurada para monitoramento de mortes')
      return
    }

    logger.info(`📊 Processando ${guildsToProcess.length} guild(s)...`)

    // 2. Agrupa por world para otimizar (múltiplas guilds no mesmo world)
    const groupedByWorld = this.groupByWorld(guildsToProcess)

    // 3. Processa cada world
    for (const [worldId, guilds] of groupedByWorld) {
      await this.processWorld(worldId, guilds)
    }

    logger.info('✅ [JobV2] Busca de mortes finalizada')
  }

  /**
   * Agrupa hunted guilds por world_id para otimizar scraping.
   */
  private groupByWorld(guilds: any[]): Map<string, any[]> {
    const map = new Map<string, any[]>()
    for (const guild of guilds) {
      const existing = map.get(guild.worldId) || []
      existing.push(guild)
      map.set(guild.worldId, existing)
    }
    return map
  }

  /**
   * Processa todas as guilds de um world específico.
   */
  private async processWorld(worldId: string, guilds: any[]): Promise<void> {
    try {
      // Busca informações do world e servidor
      const world = await this.gameWorldRepository.findById(worldId)
      if (!world) {
        logger.warn(`⚠️ World ${worldId} não encontrado`)
        return
      }

      const server = await this.gameServerRepository.findById(world.serverId)
      if (!server) {
        logger.warn(`⚠️ Servidor do world ${world.worldName} não encontrado`)
        return
      }

      logger.info(`🌍 Processando world: ${world.worldName} (${server.displayName})`)

      // Cria o scraper apropriado para este servidor
      const scraper = ScraperFactory.createDeathScraper(server)

      // Processa cada guild deste world
      for (const huntedGuild of guilds) {
        await this.processGuild(scraper, world, huntedGuild)
      }
    } catch (error) {
      logger.error(`❌ Erro ao processar world ${worldId}:`, error)
    }
  }

  /**
   * Processa uma guild específica: faz scraping e salva mortes novas.
   */
  private async processGuild(scraper: any, world: any, huntedGuild: any): Promise<void> {
    try {
      logger.info(`⚔️ Buscando mortes: ${huntedGuild.guildName}`)

      // Faz scraping das mortes
      const deaths = await scraper.fetch(
        {
          world: world.worldIdentifier,
          guild: huntedGuild.guildName
        },
        {
          maxRetries: config.scraper.maxRetries,
          retryDelayMs: config.scraper.retryDelayMs
        }
      )

      logger.info(`🧾 ${deaths.length} mortes encontradas para ${huntedGuild.guildName}`)

      // Salva apenas mortes novas (verifica por hash)
      let consecutiveExisting = 0
      const threshold = config.jobs.duplicateThreshold

      for (const death of deaths) {
        const exists = await this.deathRepository.existsByHash(death.hash)

        if (exists) {
          consecutiveExisting++
          logger.debug(`⏭️ Já existe (${consecutiveExisting}/${threshold}): ${death.playerName}`)

          if (consecutiveExisting >= threshold) {
            logger.debug('🛑 Mortes já sincronizadas, pulando restante...')
            break
          }
          continue
        }

        // Reseta contador se encontrar uma morte nova
        consecutiveExisting = 0

        logger.info(`💾 Nova morte: ${death.playerName} (${huntedGuild.guildName})`)
        await this.deathRepository.save(death)
      }
    } catch (error) {
      logger.error(`❌ Erro ao processar guild ${huntedGuild.guildName}:`, error)
    }
  }
}
