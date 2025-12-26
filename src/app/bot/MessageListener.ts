import { BaileysClient } from '../../infra/whatsapp/BaileysClient.js'
import { GroupGuard } from './GroupGuard.js'
import { CommandParser } from '../commands/CommandParser.js'

export class MessageListener {
  constructor(
    private whatsapp: BaileysClient,
    private groupGuard: GroupGuard,
    private parser: CommandParser
  ) {}

  listen() {
    this.whatsapp.onMessage(async (msg) => {
      const chatId = msg.key.remoteJid!
      const jid = msg.key.remoteJid
      const isGroup = jid?.endsWith('@g.us')
      if (!this.groupGuard.isAllowed(chatId)) return

      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text

      if (!text) return
      console.log(msg.key.remoteJid)

      if (isGroup) {
        console.log('📌 GROUP ID:', jid)
      }


      await this.parser.handle({
        text,
        chatId,
        sender: msg.key.participant || msg.key.remoteJid!
      })
    })
    
  }
}
