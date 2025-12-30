import type { Command, CommandContext } from '../../domain/commands/Command.js'
import type { CharacterRepository } from '../../domain/repositories/CharacterRepository.js'
import type { MessageSender } from '../../domain/services/MessageSender.js'
import type { CharacterType } from '../../domain/entities/Character.js'
import { normalizeText } from '../../shared/utils/normalizeText.js'

export class AddCharacterCommand implements Command {
  readonly name = 'add'
  readonly description = 'Adiciona um personagem ao banco de dados'
  readonly aliases = ['adicionar', 'novo']

  constructor(
    private characterRepository: CharacterRepository,
    private messageSender: MessageSender
  ) {}

  async execute({ text, chatId, sender }: CommandContext): Promise<void> {
    // Formato esperado: <nome> <tipo>
    // Exemplo: @bot add Foxzinhomcz MAIN
    // Exemplo: @bot add Maker Foxis MAKER
    
    const parts = text.trim().split(/\s+/)
    
    if (parts.length < 2) {
      await this.messageSender.sendMessage(chatId, {
        text: [
          '❌ *Formato inválido*',
          '',
          'Uso: @bot add <nome> <tipo>',
          '',
          'Tipos válidos: MAIN, MAKER',
          '',
          'Exemplo: @bot add Foxzinhomcz MAIN'
        ].join('\n')
      })
      return
    }

    // Último elemento é o tipo
    const typeInput = parts.pop()!.toUpperCase()
    const characterName = parts.join(' ')

    // Valida o tipo
    if (typeInput !== 'MAIN' && typeInput !== 'MAKER') {
      await this.messageSender.sendMessage(chatId, {
        text: `❌ Tipo inválido: "${typeInput}". Use MAIN ou MAKER.`
      })
      return
    }

    const type: CharacterType = typeInput

    // Verifica se já existe
    const normalizedName = normalizeText(characterName)
    const exists = await this.characterRepository.existsByName(normalizedName)

    if (exists) {
      await this.messageSender.sendMessage(chatId, {
        text: `⚠️ Personagem *${characterName}* já está cadastrado.`
      })
      return
    }

    // Extrai número do remetente (sem @s.whatsapp.net)
    const phoneNumber = sender.replace('@s.whatsapp.net', '')

    // Salva o personagem
    const character = await this.characterRepository.save({
      characterName,
      phoneNumber,
      type
    })

    await this.messageSender.sendMessage(chatId, {
      text: [
        `✅ Personagem cadastrado com sucesso!`,
        '',
        `📛 Nome: *${character.characterName}*`,
        `🎮 Tipo: *${character.type}*`,
        `📱 Dono: @${character.phoneNumber}`
      ].join('\n'),
      mentions: [`${character.phoneNumber}@s.whatsapp.net`]
    })
  }
}

