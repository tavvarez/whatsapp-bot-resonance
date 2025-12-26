import 'dotenv/config'

import { BaileysClient } from './infra/whatsapp/BaileysClient.js'
import { SupabaseCharacterRepository } from './infra/database/SupabaseCharacterRepository.js'
import { FindCharacterUseCase } from './app/usecases/FindCharacterUseCase.js'
import { FindCharacterCommand } from './app/commands/FindCharacterCommand.js'
import { CommandParser } from './app/commands/CommandParser.js'
import { GroupGuard } from './app/bot/GroupGuard.js'
import { MessageListener } from './app/bot/MessageListener.js'

const whatsapp = new BaileysClient()
await whatsapp.connect()


const repository = new SupabaseCharacterRepository()
const useCase = new FindCharacterUseCase(repository)
const command = new FindCharacterCommand(useCase, whatsapp)
const parser = new CommandParser(command)

const guard = new GroupGuard(process.env.GROUP_ID!)
const listener = new MessageListener(whatsapp, guard, parser)

whatsapp.onMessage((msg) => {
    const jid = msg.key.remoteJid
  
    if (jid?.endsWith('@g.us')) {
      console.log('📌 GROUP ID:', jid)
    }
  })


listener.listen()
