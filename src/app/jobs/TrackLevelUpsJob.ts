import type { HuntedRepository } from '../../domain/repositories/HuntedRepository.js'
import type { GuildScraper, GuildMember } from '../../domain/scrapers/GuildScraper.js'
import type { MessageSender } from '../../domain/services/MessageSender.js'
import type { Hunted } from '../../domain/entities/Hunted.js'
import { normalizeText } from '../../shared/utils/normalizeText.js'
import { config } from '../../config/index.js'
import { log } from '../../shared/utils/logger.js'

interface LevelUpEvent {
  playerName: string
  oldLevel: number
  newLevel: number
  vocation: string
  /** Quantidade de levels ganhos neste evento */
  levelsGained: number
  /** Total de levels ganhos hoje (após este evento) */
  totalGainToday: number
}

interface TrackLevelUpsJobParams {
  guild: string
  notifyTo: string
}

export class TrackLevelUpsJob {
  constructor(
    private readonly huntedRepository: HuntedRepository,
    private readonly guildScraper: GuildScraper,
    private readonly messageSender: MessageSender
  ) {}

  async execute({ guild, notifyTo }: TrackLevelUpsJobParams): Promise<void> {
    log(`📊 Verificando level ups da guild: ${guild}`)

    // 1. Busca membros atuais da guild no site (com retry)
    const currentMembers = await this.guildScraper.fetchMembers(guild, {
      maxRetries: config.scraper.maxRetries,
      retryDelayMs: config.scraper.retryDelayMs
    })

    if (currentMembers.length === 0) {
      log('⚠️ Nenhum membro encontrado na guild')
      return
    }

    // 2. Busca hunteds salvos no banco
    const hunteds = await this.huntedRepository.findActiveByGuild(guild)

    // Se não tem nenhum hunted ainda, popula a tabela com todos os membros
    if (hunteds.length === 0) {
      log('📝 Populando tabela de hunteds com membros da guild...')
      await this.initializeHunteds(currentMembers, guild)
      return
    }

    // 3. Compara e detecta level ups
    const levelUps = this.detectLevelUps(currentMembers, hunteds)

    if (levelUps.length === 0) {
      log('✅ Nenhum level up detectado')
      return
    }

    // 4. Atualiza os levels no banco
    const updates = levelUps.map(event => ({
      nameNormalized: normalizeText(event.playerName),
      newLevel: event.newLevel,
      levelsGained: event.levelsGained
    }))

    await this.huntedRepository.batchUpdateLevels(updates)


    const levelUpsToNotify = levelUps.filter((event) => event.newLevel >= 600);
    if (levelUpsToNotify.length > 0) {
      await this.notifyLevelUps(levelUpsToNotify, notifyTo);
    } else {
      log(
        `ℹ️ ${levelUps.length} level up(s) detectado(s), mas todos abaixo de 600 - não notificando`
      );
    }

    // 5. Notifica via WhatsApp
    // await this.notifyLevelUps(levelUps, notifyTo)
  }

  private async initializeHunteds(members: GuildMember[], guild: string): Promise<void> {
    let count = 0

    for (const member of members) {
      const exists = await this.huntedRepository.existsByName(normalizeText(member.playerName))
      
      if (!exists) {
        await this.huntedRepository.save({
          playerName: member.playerName,
          level: member.level,
          vocation: member.vocation,
          guild
        })
        count++
      }
    }

    log(`✅ ${count} hunteds inicializados`)
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.toISOString().split('T')[0] === date2.toISOString().split('T')[0]
  }

  private detectLevelUps(
    currentMembers: GuildMember[],
    savedHunteds: Hunted[]
  ): LevelUpEvent[] {
    const levelUps: LevelUpEvent[] = []
    const now = new Date()

    // Cria mapa de hunteds por nome normalizado para busca rápida
    const huntedMap = new Map(
      savedHunteds.map(h => [h.nameNormalized, h])
    )

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
          // Mesmo dia: soma com o acumulado
          totalGainToday = saved.levelGainToday + levelsGained
        } else {
          // Novo dia: começa do zero
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

  private async notifyLevelUps(levelUps: LevelUpEvent[], chatId: string): Promise<void> {
    const now = new Date()
    const timeStr = now.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    })
    // Agrupa em uma única mensagem para não spammar
    const lines = [
      '*HUNTEDS LEVEL UP*',
      `*Hora:* ${timeStr}`,
      ''
    ]

    for (const event of levelUps) {
      const emoji = event.totalGainToday >= 4 ? '⚠️' : '⬆️'
      const ptWarning = event.totalGainToday >= 4 ? ' _(possivelmente está caçando em PT)_' : ''
      
      lines.push(
        `${emoji} *${event.playerName}* upou -> *${event.newLevel}*`,
        `   └ ${event.vocation} (+${event.totalGainToday} levels hoje) ${ptWarning}`
      )
    }

    await this.messageSender.sendMessage(chatId, {
      text: lines.join('\n')
    })
  }
}
