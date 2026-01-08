/**
 * Container de dependências com lazy loading.
 * Usa factory functions para criar instâncias sob demanda,
 * facilitando testes e evitando side effects no import.
 */

import { BaileysClient } from '../infra/whatsapp/BaileysClient.js'
import { SupabaseCharacterRepository } from '../infra/database/SupabaseCharacterRepository.js'
import { SupabaseDeathRepository } from '../infra/database/SupabaseDeathRepository.js'
import { SupabaseHuntedRepository } from '../infra/database/SupabaseHuntedRepository.js'
import { SupabaseBotUserRepository } from '../infra/database/SupabaseBotUserRepository.js'
import { SupabaseBotGroupRepository } from '../infra/database/SupabaseBotGroupRepository.js'
import { FindCharacterUseCase } from '../app/usecases/FindCharacterUseCase.js'
import { RubinotDeathScraperV2 } from '../infra/scraper/RubinotDeathScraperV2.js'
import { RubinotGuildScraperV2 } from '../infra/scraper/RubinotGuildScraperV2.js'

/**
 * Cache de instâncias singleton
 */
class Container {
  private instances = new Map<string, unknown>();

  /**
   * Obtém ou cria uma instância singleton
   */
  private getOrCreate<T>(key: string, factory: () => T): T {
    if (!this.instances.has(key)) {
      this.instances.set(key, factory());
    }
    return this.instances.get(key) as T;
  }

  /**
   * Reseta todas as instâncias (útil para testes)
   */
  reset(): void {
    this.instances.clear();
  }

  /**
   * Reseta uma instância específica (útil para testes)
   */
  resetInstance(key: string): void {
    this.instances.delete(key);
  }

  // ==================== INFRAESTRUTURA ====================

  get whatsapp(): BaileysClient {
    return this.getOrCreate("whatsapp", () => new BaileysClient());
  }

  get characterRepository(): SupabaseCharacterRepository {
    return this.getOrCreate(
      "characterRepository",
      () => new SupabaseCharacterRepository()
    );
  }

  get deathRepository(): SupabaseDeathRepository {
    return this.getOrCreate(
      "deathRepository",
      () => new SupabaseDeathRepository()
    );
  }

  get huntedRepository(): SupabaseHuntedRepository {
    return this.getOrCreate(
      "huntedRepository",
      () => new SupabaseHuntedRepository()
    );
  }

  get botUserRepository(): SupabaseBotUserRepository {
    return this.getOrCreate(
      "botUserRepository",
      () => new SupabaseBotUserRepository()
    );
  }

  get botGroupRepository(): SupabaseBotGroupRepository {
    return this.getOrCreate(
      "botGroupRepository",
      () => new SupabaseBotGroupRepository()
    );
  }
 
  get deathScraper(): RubinotDeathScraperV2 {
    return this.getOrCreate("deathScraper", () => new RubinotDeathScraperV2());
  }

  get guildScraper(): RubinotGuildScraperV2 {
    return this.getOrCreate("guildScraper", () => new RubinotGuildScraperV2());
  }

  // ==================== USE CASES ====================

  get findCharacterUseCase(): FindCharacterUseCase {
    return this.getOrCreate(
      "findCharacterUseCase",
      () => new FindCharacterUseCase(this.characterRepository)
    );
  }
}

/**
 * Instância singleton do container.
 * Use esta instância em toda a aplicação.
 */
export const container = new Container()

