import type { Command, CommandContext } from '../../domain/commands/Command.js'
import type { FindCharacterUseCase } from '../usecases/FindCharacterUseCase.js'
import type { MessageSender } from '../../domain/services/MessageSender.js'
import { normalizeText } from '../../shared/utils/normalizeText.js'

export class FindCharacterCommand implements Command {
  readonly name = 'find'
  readonly description = 'Busca informações de um personagem'
  readonly aliases = ['f', 'buscar', 'char']
  readonly permission = 'member' as const
  readonly scope = 'member_group' as const

  constructor(
    private useCase: FindCharacterUseCase,
    private messageSender: MessageSender
  ) {}

  async execute({ text, chatId }: CommandContext): Promise<void> {
    const characterName = text.trim()

    if (!characterName) {
      await this.messageSender.sendMessage(chatId, {
        text: 'Uso: @bot find <nome do personagem>'
      })
      return
    }

    const normalizedName = normalizeText(characterName)
    const character = await this.useCase.execute(normalizedName)

    if (!character) {
      await this.messageSender.sendMessage(chatId, {
        text: `Char: *${characterName}*, não encontrado.`
      })
      return
    }

    await this.messageSender.sendMessage(chatId, {
      text: `${character.type === 'MAIN' ? 'Char Main' : 'Maker'} encontrado: @${character.phoneNumber}`,
      mentions: [`${character.phoneNumber}@s.whatsapp.net`]
    })
  }
}

// adicionar novos comandos:
// export class MeuComando implements Command {
//   readonly name = 'meucomando'
//   readonly description = 'Faz algo legal'
//   readonly aliases = ['mc']

//   async execute({ text, chatId }: CommandContext): Promise<void> {
//     // lógica aqui
//   }
// }

// // No index.ts:
// parser.register(new MeuComando())