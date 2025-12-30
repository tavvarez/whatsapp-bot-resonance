import { ConfigError } from '../shared/errors/index.js'

/**
 * Configurações centralizadas da aplicação.
 * Valores podem ser sobrescritos por variáveis de ambiente.
 */

function getEnvOrThrow(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new ConfigError(`Variável de ambiente obrigatória não definida: ${key}`)
  }
  return value
}

function getEnvOrDefault(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue
}

function getEnvNumberOrDefault(key: string, defaultValue: number): number {
  const value = process.env[key]
  return value ? Number(value) : defaultValue
}

export const config = {
  /**
   * Configurações do Supabase
   */
  supabase: {
    url: getEnvOrThrow('SUPABASE_URL'),
    serviceRoleKey: getEnvOrThrow('SUPABASE_SERVICE_ROLE_KEY')
  },

  /**
   * Configurações do WhatsApp
   */
  whatsapp: {
    groupId: getEnvOrThrow('GROUP_ID'),
    groupIdNotifyDeaths: getEnvOrThrow('GROUP_ID_NOTIFY_DEATHS'),
    groupIdNotifyLevelUps: getEnvOrThrow('GROUP_ID_NOTIFY_LEVELUPS')
  },

  /**
   * Configurações do jogo (Rubinot)
   */
  game: {
    world: getEnvOrThrow('WORLD'),
    guild: getEnvOrThrow('GUILD')
  },

  /**
   * Configurações dos Jobs
   */
  jobs: {
    /** Intervalo entre execuções do job de mortes (em ms) - padrão 5min */
    deathIntervalMs: getEnvNumberOrDefault('JOB_DEATH_INTERVAL_MS', 5 * 60 * 1000),
    
    /** Intervalo entre execuções do job de level up (em ms) - padrão 9 min */
    levelUpIntervalMs: getEnvNumberOrDefault('JOB_LEVELUP_INTERVAL_MS', 9 * 60 * 1000),
    
    /** Quantas mortes consecutivas já existentes para parar de verificar */
    duplicateThreshold: getEnvNumberOrDefault('DUPLICATE_THRESHOLD', 2),
    
    /** Máximo de mortes não notificadas para buscar por ciclo */
    notifyLimit: getEnvNumberOrDefault('NOTIFY_LIMIT', 6),
    
    /** Quantas mortes por mensagem */
    notifyBatchSize: getEnvNumberOrDefault('NOTIFY_BATCH_SIZE', 10),
    
    /** Delay entre mensagens em batch (em ms) */
    notifyBatchDelayMs: getEnvNumberOrDefault('NOTIFY_BATCH_DELAY_MS', 1000)
  },

  /**
   * Configurações do Scraper
   */
  scraper: {
    /** Número máximo de tentativas */
    maxRetries: getEnvNumberOrDefault('SCRAPER_MAX_RETRIES', 5),
    
    /** Delay base entre tentativas (em ms) */
    retryDelayMs: getEnvNumberOrDefault('SCRAPER_RETRY_DELAY_MS', 10000)
  }
} as const

