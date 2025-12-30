/**
 * Representa um membro da guild com seu nível atual.
 */
export interface GuildMember {
  playerName: string
  level: number
  vocation: string
  isOnline: boolean
}

/**
 * Opções para busca de membros da guild.
 */
export interface FetchMembersOptions {
  maxRetries?: number
  retryDelayMs?: number
}

/**
 * Interface para scrapers de dados de guild.
 */
export interface GuildScraper {
  /**
   * Busca todos os membros de uma guild com seus níveis atuais.
   */
  fetchMembers(guildName: string, options?: FetchMembersOptions): Promise<GuildMember[]>
}
