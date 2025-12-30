/**
 * Container de dependências.
 * Centraliza a criação e injeção de dependências da aplicação.
 */

import { BaileysClient } from '../infra/whatsapp/BaileysClient.js'
import { SupabaseCharacterRepository } from '../infra/database/SupabaseCharacterRepository.js'
import { SupabaseDeathRepository } from '../infra/database/SupabaseDeathRepository.js'
import { SupabaseHuntedRepository } from '../infra/database/SupabaseHuntedRepository.js'
import { RubinotDeathScraper } from '../infra/scraper/RubinotDeathScraper.js'
import { RubinotGuildScraper } from '../infra/scraper/RubinotGuildScraper.js'
import { FindCharacterUseCase } from '../app/usecases/FindCharacterUseCase.js'

// Infraestrutura
const whatsapp = new BaileysClient()
const characterRepository = new SupabaseCharacterRepository()
const deathRepository = new SupabaseDeathRepository()
const huntedRepository = new SupabaseHuntedRepository()
const deathScraper = new RubinotDeathScraper()
const guildScraper = new RubinotGuildScraper()

// Use Cases
const findCharacterUseCase = new FindCharacterUseCase(characterRepository)

/**
 * Container com todas as dependências da aplicação.
 * Permite acesso centralizado e facilita testes.
 */
export const container = {
  // Infraestrutura
  whatsapp,
  characterRepository,
  deathRepository,
  huntedRepository,
  deathScraper,
  guildScraper,

  // Use Cases
  findCharacterUseCase
} as const

