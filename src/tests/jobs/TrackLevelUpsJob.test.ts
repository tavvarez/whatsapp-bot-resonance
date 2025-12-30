import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TrackLevelUpsJob } from '../../app/jobs/TrackLevelUpsJob.js'
import type { HuntedRepository } from '../../domain/repositories/HuntedRepository.js'
import type { GuildScraper, GuildMember } from '../../domain/scrapers/GuildScraper.js'
import type { MessageSender } from '../../domain/services/MessageSender.js'

// Mock do logger para não poluir os testes
vi.mock('../../shared/utils/logger.js', () => ({
  log: vi.fn(),
  logError: vi.fn()
}))

// Mock do config para não precisar de variáveis de ambiente
vi.mock('../../config/index.js', () => ({
  config: {
    scraper: {
      maxRetries: 3,
      retryDelayMs: 1000
    }
  }
}))

describe('TrackLevelUpsJob', () => {
  let job: TrackLevelUpsJob
  let mockHuntedRepository: HuntedRepository
  let mockGuildScraper: GuildScraper
  let mockMessageSender: MessageSender

  beforeEach(() => {
    mockHuntedRepository = {
      findActiveByGuild: vi.fn(),
      findByName: vi.fn(),
      existsByName: vi.fn(),
      save: vi.fn(),
      updateLevel: vi.fn(),
      batchUpdateLevels: vi.fn(),
      deactivate: vi.fn()
    }

    mockGuildScraper = {
      fetchMembers: vi.fn()
    }

    mockMessageSender = {
      sendMessage: vi.fn()
    }

    job = new TrackLevelUpsJob(
      mockHuntedRepository,
      mockGuildScraper,
      mockMessageSender
    )
  })

  describe('execute', () => {
    it('não deve fazer nada se não encontrar membros na guild', async () => {
      vi.mocked(mockGuildScraper.fetchMembers).mockResolvedValue([])

      await job.execute({ guild: 'Genesis', notifyTo: 'chat123' })

      expect(mockHuntedRepository.findActiveByGuild).not.toHaveBeenCalled()
      expect(mockMessageSender.sendMessage).not.toHaveBeenCalled()
    })

    it('deve inicializar hunteds se tabela estiver vazia', async () => {
      const members: GuildMember[] = [
        { playerName: 'Be Na Ti', level: 1686, vocation: 'Elite Knight', isOnline: true },
        { playerName: 'Foxzinho', level: 1000, vocation: 'Royal Paladin', isOnline: false }
      ]

      vi.mocked(mockGuildScraper.fetchMembers).mockResolvedValue(members)
      vi.mocked(mockHuntedRepository.findActiveByGuild).mockResolvedValue([])
      vi.mocked(mockHuntedRepository.existsByName).mockResolvedValue(false)
      vi.mocked(mockHuntedRepository.save).mockResolvedValue({} as any)

      await job.execute({ guild: 'Genesis', notifyTo: 'chat123' })

      expect(mockHuntedRepository.save).toHaveBeenCalledTimes(2)
      expect(mockMessageSender.sendMessage).not.toHaveBeenCalled()
    })

    it('deve detectar level up quando level atual é maior que salvo', async () => {
      const members: GuildMember[] = [
        { playerName: 'Be Na Ti', level: 1687, vocation: 'Elite Knight', isOnline: true }
      ]

      const savedHunteds = [
        { playerName: 'Be Na Ti', nameNormalized: 'be na ti', lastKnownLevel: 1686, guild: 'Genesis', isActive: true }
      ]

      vi.mocked(mockGuildScraper.fetchMembers).mockResolvedValue(members)
      vi.mocked(mockHuntedRepository.findActiveByGuild).mockResolvedValue(savedHunteds as any)
      vi.mocked(mockHuntedRepository.batchUpdateLevels).mockResolvedValue()
      vi.mocked(mockMessageSender.sendMessage).mockResolvedValue()

      await job.execute({ guild: 'Genesis', notifyTo: 'chat123' })

      expect(mockHuntedRepository.batchUpdateLevels).toHaveBeenCalledWith([
        { nameNormalized: 'be na ti', newLevel: 1687 }
      ])
      expect(mockMessageSender.sendMessage).toHaveBeenCalled()
    })

    it('não deve notificar se não houver level ups', async () => {
      const members: GuildMember[] = [
        { playerName: 'Be Na Ti', level: 1686, vocation: 'Elite Knight', isOnline: true }
      ]

      const savedHunteds = [
        { playerName: 'Be Na Ti', nameNormalized: 'be na ti', lastKnownLevel: 1686, guild: 'Genesis', isActive: true }
      ]

      vi.mocked(mockGuildScraper.fetchMembers).mockResolvedValue(members)
      vi.mocked(mockHuntedRepository.findActiveByGuild).mockResolvedValue(savedHunteds as any)

      await job.execute({ guild: 'Genesis', notifyTo: 'chat123' })

      expect(mockHuntedRepository.batchUpdateLevels).not.toHaveBeenCalled()
      expect(mockMessageSender.sendMessage).not.toHaveBeenCalled()
    })

    it('deve detectar múltiplos level ups', async () => {
      const members: GuildMember[] = [
        { playerName: 'Be Na Ti', level: 1690, vocation: 'Elite Knight', isOnline: true },
        { playerName: 'Foxzinho', level: 1010, vocation: 'Royal Paladin', isOnline: false }
      ]

      const savedHunteds = [
        { playerName: 'Be Na Ti', nameNormalized: 'be na ti', lastKnownLevel: 1686, guild: 'Genesis', isActive: true },
        { playerName: 'Foxzinho', nameNormalized: 'foxzinho', lastKnownLevel: 1000, guild: 'Genesis', isActive: true }
      ]

      vi.mocked(mockGuildScraper.fetchMembers).mockResolvedValue(members)
      vi.mocked(mockHuntedRepository.findActiveByGuild).mockResolvedValue(savedHunteds as any)
      vi.mocked(mockHuntedRepository.batchUpdateLevels).mockResolvedValue()
      vi.mocked(mockMessageSender.sendMessage).mockResolvedValue()

      await job.execute({ guild: 'Genesis', notifyTo: 'chat123' })

      expect(mockHuntedRepository.batchUpdateLevels).toHaveBeenCalledWith([
        { nameNormalized: 'be na ti', newLevel: 1690 },
        { nameNormalized: 'foxzinho', newLevel: 1010 }
      ])
    })

    it('não deve detectar level up se level atual é menor (morte)', async () => {
      const members: GuildMember[] = [
        { playerName: 'Be Na Ti', level: 1680, vocation: 'Elite Knight', isOnline: true }
      ]

      const savedHunteds = [
        { playerName: 'Be Na Ti', nameNormalized: 'be na ti', lastKnownLevel: 1686, guild: 'Genesis', isActive: true }
      ]

      vi.mocked(mockGuildScraper.fetchMembers).mockResolvedValue(members)
      vi.mocked(mockHuntedRepository.findActiveByGuild).mockResolvedValue(savedHunteds as any)

      await job.execute({ guild: 'Genesis', notifyTo: 'chat123' })

      expect(mockHuntedRepository.batchUpdateLevels).not.toHaveBeenCalled()
      expect(mockMessageSender.sendMessage).not.toHaveBeenCalled()
    })

    it('deve ignorar membros que não estão na lista de hunteds', async () => {
      const members: GuildMember[] = [
        { playerName: 'Novo Membro', level: 500, vocation: 'Druid', isOnline: true }
      ]

      const savedHunteds = [
        { playerName: 'Be Na Ti', nameNormalized: 'be na ti', lastKnownLevel: 1686, guild: 'Genesis', isActive: true }
      ]

      vi.mocked(mockGuildScraper.fetchMembers).mockResolvedValue(members)
      vi.mocked(mockHuntedRepository.findActiveByGuild).mockResolvedValue(savedHunteds as any)

      await job.execute({ guild: 'Genesis', notifyTo: 'chat123' })

      expect(mockHuntedRepository.batchUpdateLevels).not.toHaveBeenCalled()
      expect(mockMessageSender.sendMessage).not.toHaveBeenCalled()
    })
  })
})

