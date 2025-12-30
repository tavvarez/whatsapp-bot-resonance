import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FetchLatestDeathsJob } from '../../app/jobs/FetchLatestDeathsJob.js'
import type { DeathRepository } from '../../domain/repositories/DeathRepository.js'
import type { DeathScraper } from '../../domain/scrapers/DeathScraper.js'
import type { DeathEvent } from '../../domain/entities/DeathEvent.js'

// Mock do logger e config
vi.mock('../../shared/utils/logger.js', () => ({
  log: vi.fn(),
  logError: vi.fn()
}))

vi.mock('../../config/index.js', () => ({
  config: {
    scraper: {
      maxRetries: 3,
      retryDelayMs: 1000
    },
    jobs: {
      duplicateThreshold: 2
    }
  }
}))

describe('FetchLatestDeathsJob', () => {
  let job: FetchLatestDeathsJob
  let mockDeathRepository: DeathRepository
  let mockScraper: DeathScraper

  const createDeathEvent = (playerName: string, hash: string): DeathEvent => ({
    playerName,
    hash,
    world: 'Mystian',
    guild: 'Genesis',
    level: 1000,
    occurredAt: new Date(),
    rawText: `${playerName} died at level 1000`
  })

  beforeEach(() => {
    mockDeathRepository = {
      existsByHash: vi.fn(),
      save: vi.fn(),
      findUnnotified: vi.fn(),
      markAsNotified: vi.fn(),
      getLastNotificationTime: vi.fn()
    }

    mockScraper = {
      fetch: vi.fn()
    }

    job = new FetchLatestDeathsJob(mockDeathRepository, mockScraper)
  })

  describe('execute', () => {
    it('deve salvar mortes novas', async () => {
      const deaths = [
        createDeathEvent('Foxzinho', 'hash1'),
        createDeathEvent('Be Na Ti', 'hash2')
      ]

      vi.mocked(mockScraper.fetch).mockResolvedValue(deaths)
      vi.mocked(mockDeathRepository.existsByHash).mockResolvedValue(false)
      vi.mocked(mockDeathRepository.save).mockResolvedValue()

      await job.execute({ world: 'Mystian', guild: 'Genesis' })

      expect(mockDeathRepository.save).toHaveBeenCalledTimes(2)
    })

    it('deve pular mortes que já existem', async () => {
      const deaths = [
        createDeathEvent('Foxzinho', 'hash1')
      ]

      vi.mocked(mockScraper.fetch).mockResolvedValue(deaths)
      vi.mocked(mockDeathRepository.existsByHash).mockResolvedValue(true)

      await job.execute({ world: 'Mystian', guild: 'Genesis' })

      expect(mockDeathRepository.save).not.toHaveBeenCalled()
    })

    it('deve parar após threshold de mortes consecutivas existentes', async () => {
      const deaths = [
        createDeathEvent('Player1', 'hash1'),
        createDeathEvent('Player2', 'hash2'),
        createDeathEvent('Player3', 'hash3'),
        createDeathEvent('Player4', 'hash4')
      ]

      vi.mocked(mockScraper.fetch).mockResolvedValue(deaths)
      // Todas as mortes já existem
      vi.mocked(mockDeathRepository.existsByHash).mockResolvedValue(true)

      await job.execute({ world: 'Mystian', guild: 'Genesis' })

      // Threshold é 2, então deve checar apenas 2 vezes e parar
      expect(mockDeathRepository.existsByHash).toHaveBeenCalledTimes(2)
      expect(mockDeathRepository.save).not.toHaveBeenCalled()
    })

    it('deve resetar contador ao encontrar morte nova', async () => {
      const deaths = [
        createDeathEvent('Player1', 'hash1'), // existe
        createDeathEvent('Player2', 'hash2'), // nova
        createDeathEvent('Player3', 'hash3'), // existe
        createDeathEvent('Player4', 'hash4')  // existe
      ]

      vi.mocked(mockScraper.fetch).mockResolvedValue(deaths)
      vi.mocked(mockDeathRepository.existsByHash)
        .mockResolvedValueOnce(true)   // hash1 existe
        .mockResolvedValueOnce(false)  // hash2 nova
        .mockResolvedValueOnce(true)   // hash3 existe
        .mockResolvedValueOnce(true)   // hash4 existe

      vi.mocked(mockDeathRepository.save).mockResolvedValue()

      await job.execute({ world: 'Mystian', guild: 'Genesis' })

      // Deve salvar apenas Player2
      expect(mockDeathRepository.save).toHaveBeenCalledTimes(1)
      // Deve verificar todas as 4 mortes (contador reseta após Player2)
      expect(mockDeathRepository.existsByHash).toHaveBeenCalledTimes(4)
    })

    it('não deve fazer nada se scraper retornar lista vazia', async () => {
      vi.mocked(mockScraper.fetch).mockResolvedValue([])

      await job.execute({ world: 'Mystian', guild: 'Genesis' })

      expect(mockDeathRepository.existsByHash).not.toHaveBeenCalled()
      expect(mockDeathRepository.save).not.toHaveBeenCalled()
    })

    it('deve passar parâmetros corretos para o scraper', async () => {
      vi.mocked(mockScraper.fetch).mockResolvedValue([])

      await job.execute({ world: 'Mystian', guild: 'Genesis' })

      expect(mockScraper.fetch).toHaveBeenCalledWith(
        { world: 'Mystian', guild: 'Genesis' },
        { maxRetries: 3, retryDelayMs: 1000 }
      )
    })
  })
})

