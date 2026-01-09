import type { DeathScraper } from '../../domain/scrapers/DeathScraper.js'
import type { GuildScraper } from '../../domain/scrapers/GuildScraper.js'
import type { GameServer } from '../../domain/entities/GameServer.js'
import { RubinotDeathScraperV2 } from './RubinotDeathScraperV2.js'
import { RubinotGuildScraperV2 } from './RubinotGuildScraperV2.js'
import { logger } from '../../shared/utils/logger.js'

// Importar scrapers para outros servidores quando implementados
// import { TibiaOfficialDeathScraper } from './TibiaOfficialDeathScraper.js'
// import { TibiaOfficialGuildScraper } from './TibiaOfficialGuildScraper.js'

/**
 * Factory para criar scrapers específicos com base no tipo de servidor.
 * Permite suportar múltiplos servidores (Rubinot, Tibia Global, outros OTServers)
 * sem acoplamento no código de negócio.
 */
export class ScraperFactory {
  /**
   * Cria um scraper de mortes apropriado para o servidor.
   */
  static createDeathScraper(server: GameServer): DeathScraper {
    logger.debug(`🏭 ScraperFactory: Criando DeathScraper para ${server.displayName} (tipo: ${server.scraperType})`)

    switch (server.scraperType) {
      case 'rubinot':
        return new RubinotDeathScraperV2()

      case 'tibia_official':
        // return new TibiaOfficialDeathScraper()
        throw new Error(
          `Scraper para Tibia Official ainda não implementado. ` +
          `Contribua implementando TibiaOfficialDeathScraper!`
        )

      case 'generic_ots':
        throw new Error(
          `Scraper genérico para OTServer ainda não implementado. ` +
          `Configure o servidor como 'rubinot' se o layout for compatível.`
        )

      default:
        throw new Error(
          `Tipo de scraper desconhecido: ${server.scraperType}. ` +
          `Tipos suportados: rubinot, tibia_official, generic_ots`
        )
    }
  }

  /**
   * Cria um scraper de guild apropriado para o servidor.
   */
  static createGuildScraper(server: GameServer): GuildScraper {
    logger.debug(`🏭 ScraperFactory: Criando GuildScraper para ${server.displayName} (tipo: ${server.scraperType})`)

    switch (server.scraperType) {
      case 'rubinot':
        return new RubinotGuildScraperV2()

      case 'tibia_official':
        // return new TibiaOfficialGuildScraper()
        throw new Error(
          `Scraper para Tibia Official ainda não implementado. ` +
          `Contribua implementando TibiaOfficialGuildScraper!`
        )

      case 'generic_ots':
        throw new Error(
          `Scraper genérico para OTServer ainda não implementado. ` +
          `Configure o servidor como 'rubinot' se o layout for compatível.`
        )

      default:
        throw new Error(
          `Tipo de scraper desconhecido: ${server.scraperType}. ` +
          `Tipos suportados: rubinot, tibia_official, generic_ots`
        )
    }
  }

  /**
   * Verifica se um tipo de scraper é suportado.
   */
  static isScraperSupported(scraperType: string): boolean {
    return ['rubinot', 'tibia_official', 'generic_ots'].includes(scraperType)
  }

  /**
   * Lista os tipos de scrapers suportados.
   */
  static getSupportedScraperTypes(): string[] {
    return ['rubinot', 'tibia_official', 'generic_ots']
  }
}
