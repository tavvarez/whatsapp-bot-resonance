import type { DeathEvent } from '../entities/DeathEvent.js'

/**
 * Interface para scrapers de mortes.
 * Permite desacoplar a lógica de negócio da implementação específica do site.
 */
export interface FetchDeathsParams {
  world: string
  guild: string
}

export interface FetchDeathsOptions {
  maxRetries?: number
  retryDelayMs?: number
}

export interface DeathScraper {
  fetch(params: FetchDeathsParams, options?: FetchDeathsOptions): Promise<DeathEvent[]>
}

