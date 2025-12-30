/**
 * Setup do bot de WhatsApp e listener de mensagens.
 */

import { GroupGuard } from '../app/bot/GroupGuard.js'
import { MessageListener } from '../app/bot/MessageListener.js'
import type { CommandParser } from '../app/commands/CommandParser.js'
import { container } from './container.js'
import { config } from '../config/index.js'
import { log } from '../shared/utils/logger.js'

/**
 * Configura o listener de mensagens do bot.
 */
export function setupBot(parser: CommandParser): MessageListener {
  const { whatsapp } = container

  const guard = new GroupGuard(config.whatsapp.groupId)
  const listener = new MessageListener(whatsapp, guard, parser)

  // Debug: mostra ID dos grupos
  whatsapp.onMessage((msg) => {
    const jid = msg.key.remoteJid
    if (jid?.endsWith('@g.us')) {
      log(`📌 GROUP ID: ${jid}`)
    }
  })

  return listener
}

/**
 * Conecta ao WhatsApp.
 */
export async function connectWhatsApp(): Promise<void> {
  const { whatsapp } = container
  await whatsapp.connect()
  log('✅ WhatsApp conectado')
}

