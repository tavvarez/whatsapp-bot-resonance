import type { HuntedRepository } from '../../domain/repositories/HuntedRepository.js'
import type { HuntedGuildRepository } from '../../domain/repositories/HuntedGuildRepository.js'
import type { GameWorldRepository } from '../../domain/repositories/GameWorldRepository.js'
import type { GameServerRepository } from '../../domain/repositories/GameServerRepository.js'
import type { MessageSender } from '../../domain/services/MessageSender.js'
import type { Hunted } from '../../domain/entities/Hunted.js'
import { ScraperFactory } from '../../infra/scraper/ScraperFactory.js'
import { normalizeText } from '../../shared/utils/normalizeText.js'
import { config } from '../../config/index.js'
import { logger } from '../../shared/utils/logger.js'

interface LevelUpEvent {
  playerName: string
  oldLevel: number
  newLevel: number
  vocation: string
  levelsGained: number
  totalGainToday: number
}

/**
 * Job V2 para rastrear level ups de múltiplas guilds (multi-tenancy).
 * Compara níveis atuais da guild com os salvos no banco e detecta level ups.
 */
export class TrackLevelUpsJobV2 {
  constructor(
    private readonly huntedRepository: HuntedRepository,
    private readonly huntedGuildRepository: HuntedGuildRepository,
    private readonly gameWorldRepository: GameWorldRepository,
    private readonly gameServerRepository: GameServerRepository,
    private readonly messageSender: MessageSender
  ) {}

  async execute(): Promise<void> {
    logger.info('📊 [JobV2] Iniciando rastreamento de level ups multi-tenancy...')

    // 1. Busca todas as hunted guilds ativas que querem notificações de level up
    const huntedGuilds = await this.huntedGuildRepository.listAllActive()
    const guildsToProcess = huntedGuilds.filter(hg => hg.notifyLevelUps)

    if (guildsToProcess.length === 0) {
      logger.info('⚠️ Nenhuma guild configurada para monitoramento de level ups')
      return
    }

    logger.info(`📊 Processando ${guildsToProcess.length} guild(s)...`)

    // 2. Agrupa por world para otimizar scraping
    const groupedByWorld = this.groupByWorld(guildsToProcess)

    // 3. Processa cada world
    for (const [worldId, guilds] of groupedByWorld) {
      await this.processWorld(worldId, guilds)
    }

    logger.info('✅ [JobV2] Rastreamento de level ups finalizado')
  }

  /**
   * Agrupa hunted guilds por world_id.
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
      const scraper = ScraperFactory.createGuildScraper(server)

      // Processa cada guild deste world
      for (const huntedGuild of guilds) {
        await this.processGuild(scraper, huntedGuild)
      }
    } catch (error) {
      logger.error(`❌ Erro ao processar world ${worldId}:`, error)
    }
  }

  /**
   * Processa uma guild específica: busca membros, compara níveis, detecta level ups.
   */
  private async processGuild(scraper: any, huntedGuild: any): Promise<void> {
    try {
      logger.info(`⚔️ Verificando level ups: ${huntedGuild.guildName}`)

      // 1. Busca membros atuais da guild no site
      const currentMembers = await scraper.fetchMembers(huntedGuild.guildName, {
        maxRetries: config.scraper.maxRetries,
        retryDelayMs: config.scraper.retryDelayMs
      })

      if (currentMembers.length === 0) {
        logger.warn(`⚠️ Nenhum membro encontrado na guild ${huntedGuild.guildName}`)
        return
      }

      logger.info(`👥 ${currentMembers.length} membros encontrados em ${huntedGuild.guildName}`)

      // 2. Busca hunteds salvos no banco desta guild
      const hunteds = await this.huntedRepository.findActiveByGuild(huntedGuild.guildName)

      // Se não tem nenhum hunted ainda, popula a tabela
      if (hunteds.length === 0) {
        logger.info(`📝 Populando hunteds para ${huntedGuild.guildName}...`)
        await this.initializeHunteds(currentMembers, huntedGuild)
        return
      }

      // 3. Detecta level ups
      const levelUps = this.detectLevelUps(currentMembers, hunteds)

      if (levelUps.length === 0) {
        logger.info(`✅ Nenhum level up detectado em ${huntedGuild.guildName}`)
        return
      }

      // 4. Atualiza os levels no banco
      const updates = levelUps.map(event => ({
        nameNormalized: normalizeText(event.playerName),
        newLevel: event.newLevel,
        levelsGained: event.levelsGained
      }))

      await this.huntedRepository.batchUpdateLevels(updates)

      // 5. Filtra por nível mínimo e notifica
      const levelUpsToNotify = levelUps.filter(
        (event) => event.newLevel >= huntedGuild.minLevelNotify
      )

      if (levelUpsToNotify.length > 0) {
        // TODO: Precisa buscar o groupId do WhatsApp do BotGroup
        // Por enquanto, vamos usar o botGroupId
        const chatId = huntedGuild.botGroupId // Temporário
        await this.notifyLevelUps(levelUpsToNotify, chatId, huntedGuild.guildName)
      } else {
        logger.info(
          `ℹ️ ${levelUps.length} level up(s) em ${huntedGuild.guildName}, mas todos abaixo de ${huntedGuild.minLevelNotify}`
        )
      }
    } catch (error) {
      logger.error(`❌ Erro ao processar guild ${huntedGuild.guildName}:`, error)
    }
  }

  /**
   * Inicializa hunteds com membros atuais da guild.
   */
  private async initializeHunteds(members: any[], huntedGuild: any): Promise<void> {
    let count = 0

    for (const member of members) {
      const exists = await this.huntedRepository.existsByName(normalizeText(member.playerName))

      if (!exists) {
        await this.huntedRepository.save({
          playerName: member.playerName,
          level: member.level,
          vocation: member.vocation,
          guild: huntedGuild.guildName
        })
        count++
      }
    }

    logger.info(`✅ ${count} hunteds inicializados para ${huntedGuild.guildName}`)
  }

  /**
   * Verifica se duas datas são do mesmo dia.
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.toISOString().split('T')[0] === date2.toISOString().split('T')[0]
  }

  /**
   * Detecta level ups comparando membros atuais com hunteds salvos.
   */
  private detectLevelUps(currentMembers: any[], savedHunteds: Hunted[]): LevelUpEvent[] {
    const levelUps: LevelUpEvent[] = []
    const now = new Date()

    // Cria mapa de hunteds por nome normalizado
    const huntedMap = new Map(savedHunteds.map(h => [h.nameNormalized, h]))

    for (const member of currentMembers) {
      const normalized = normalizeText(member.playerName)
      const saved = huntedMap.get(normalized)

      if (!saved) continue

      // Detecta se subiu de level
      if (member.level > saved.lastKnownLevel) {
        const levelsGained = member.level - saved.lastKnownLevel

        // Calcula o total do dia
        let totalGainToday: number
        if (saved.lastLevelUpDate && this.isSameDay(saved.lastLevelUpDate, now)) {
          totalGainToday = saved.levelGainToday + levelsGained
        } else {
          totalGainToday = levelsGained
        }

        levelUps.push({
          playerName: member.playerName,
          oldLevel: saved.lastKnownLevel,
          newLevel: member.level,
          vocation: member.vocation,
          levelsGained,
          totalGainToday
        })
      }
    }

    return levelUps
  }

  /**
   * Notifica level ups via WhatsApp.
   */
  private async notifyLevelUps(
    levelUps: LevelUpEvent[],
    chatId: string,
    guildName: string
  ): Promise<void> {
    const now = new Date()
    const timeStr = now.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    })

    const lines = [
      `*LEVEL UP - ${guildName.toUpperCase()}*`,
      `*Hora:* ${timeStr}`,
      ''
    ]

    for (const event of levelUps) {
      const emoji = event.totalGainToday >= 4 ? '⚠️' : '⬆️'
      const ptWarning = event.totalGainToday >= 4 ? ' _(possivelmente PT)_' : ''

      lines.push(
        `${emoji} *${event.playerName}* upou -> *${event.newLevel}*`,
        `   └ ${event.vocation} (+${event.totalGainToday} levels hoje) ${ptWarning}`
      )
    }

    await this.messageSender.sendMessage(chatId, {
      text: lines.join('\n')
    })

    logger.info(`📨 ${levelUps.length} level ups notificados para ${chatId}`)
  }
}
