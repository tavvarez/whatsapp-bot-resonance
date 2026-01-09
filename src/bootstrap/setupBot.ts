/**
 * Setup do bot de WhatsApp e listener de mensagens.
 */

import { GroupGuard } from '../app/bot/GroupGuard.js'
import { MessageListener } from '../app/bot/MessageListener.js'
import type { CommandParser } from '../app/commands/CommandParser.js'
import { container } from './container.js'
import { logger } from '../shared/utils/logger.js'

/**
 * Configura o listener de mensagens do bot.
 */
export async function setupBot(parser: CommandParser): Promise<MessageListener> {
  const { whatsapp, botGroupRepository } = container

  // Usa o repositório para validar grupos dinamicamente
  const guard = new GroupGuard(botGroupRepository)
  
  // Força refresh do cache na inicialização
  await guard.forceRefresh()
  logger.info('✅ Cache de grupos inicializado')
  
  const listener = new MessageListener(whatsapp, guard, parser)

  return listener
}

/**
 * Conecta ao WhatsApp.
 */
export async function connectWhatsApp(): Promise<void> {
  const { whatsapp } = container
  await whatsapp.connect()
  logger.success('✅ WhatsApp conectado')
}

