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
 * Interface para scrapers de dados de guild.
 */
export interface GuildScraper {
  /**
   * Busca todos os membros de uma guild com seus níveis atuais.
   */
  fetchMembers(guildName: string): Promise<GuildMember[]>
}

