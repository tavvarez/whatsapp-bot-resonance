import { FindCharacterUseCase } from '../usecases/FindCharacterUseCase.js'
import { BaileysClient } from '../../infra/whatsapp/BaileysClient.js'
import { normalizeText } from '../../shared/utils/normalizeText.js'

interface Input {
  characterName: string
  chatId: string
}

export class FindCharacterCommand {
  constructor(
    private useCase: FindCharacterUseCase,
    private whatsapp: BaileysClient
  ) {}

  async execute({ characterName, chatId }: Input) {
    const normalizedName = normalizeText(characterName)
    const character = await this.useCase.execute(normalizedName)

    if (!character) {
      await this.whatsapp.sendMessage(chatId, {
        text: `Char: *${characterName}*, não encontrado.`
      })
      return
    }

    const jid = `${character.phoneNumber}@s.whatsapp.net`

    await this.whatsapp.sendMessage(chatId, {
      text: `${character.type === 'MAIN' ? 'Char Main' : 'Maker'} encontrado: @${character.phoneNumber}`,
      mentions: [`${character.phoneNumber}@s.whatsapp.net`]
    })
  }
}
