import type { Command, CommandContext } from '../../domain/commands/Command.js'
import type { CharacterRepository } from '../../domain/repositories/CharacterRepository.js'
import type { MessageSender } from '../../domain/services/MessageSender.js'
import type { CharacterType } from '../../domain/entities/Character.js'
import { normalizeText } from '../../shared/utils/normalizeText.js'

export class AddCharacterCommand implements Command {
  readonly name = 'add'
  readonly description = 'Adiciona um personagem ao banco de dados (admin only)'
  readonly aliases = ['adicionar', 'novo']
  readonly permission = 'admin' as const
  readonly scope = 'admin_group' as const

  constructor(
    private characterRepository: CharacterRepository,
    private messageSender: MessageSender
  ) {}

  async execute({ text, chatId, sender }: CommandContext): Promise<void> {
    // Formato esperado: <nome> <tipo> <telefone>
    // Exemplo: @bot add Leau Lanches MAIN 47996035147
    // Exemplo: @bot add Maker Foxis MAKER 5547996035147
    
    const parts = text.trim().split(/\s+/)
    
    if (parts.length < 3) {
      await this.messageSender.sendMessage(chatId, {
        text: [
          '❌ *Formato inválido*',
          '',
          'Uso: @bot add <nome> <tipo> <telefone>',
          '',
          'Tipos válidos: MAIN, MAKER',
          '',
          'Exemplos:',
          '• @bot add Leau Lanches MAIN 479xxxxxxxx',
          '• @bot add Leau Lanches MAIN 55479xxxxxxxx'
        ].join('\n')
      })
      return
    }

    // Último elemento é o telefone
    const phoneInput = parts.pop()!
    // Penúltimo elemento é o tipo
    const typeInput = parts.pop()!.toUpperCase()
    // Resto é o nome
    const characterName = parts.join(' ')

    // Valida o tipo
    if (typeInput !== 'MAIN' && typeInput !== 'MAKER') {
      await this.messageSender.sendMessage(chatId, {
        text: `❌ Tipo inválido: "${typeInput}". Use MAIN ou MAKER.`
      })
      return
    }

    const type: CharacterType = typeInput

    // Processa o telefone
    let phoneNumber = phoneInput.replace(/\D/g, '') // Remove não-dígitos
    
    // Se não começar com 55, adiciona (código do Brasil)
    if (!phoneNumber.startsWith('55')) {
      phoneNumber = '55' + phoneNumber
    }

    // Valida tamanho (55 + DDD (2) + número (8 ou 9) = 12 ou 13 dígitos)
    if (phoneNumber.length < 12 || phoneNumber.length > 13) {
      await this.messageSender.sendMessage(chatId, {
        text: [
          '❌ *Telefone inválido*',
          '',
          `Recebido: ${phoneInput}`,
          `Processado: ${phoneNumber}`,
          '',
          'Formato esperado:',
          '• 479xxxxxxxx (DDD + número)',
          '• 55479xxxxxxxx (com código do país)'
        ].join('\n')
      })
      return
    }

    // Verifica se já existe
    const normalizedName = normalizeText(characterName)
    const exists = await this.characterRepository.existsByName(normalizedName)

    if (exists) {
      await this.messageSender.sendMessage(chatId, {
        text: `⚠️ Personagem *${characterName}* já está cadastrado.`
      })
      return
    }

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
        `Nome: *${character.characterName}*`,
        `Tipo: *${character.type}*`,
        `Dono: @${character.phoneNumber}`
      ].join('\n'),
      mentions: [`${character.phoneNumber}@s.whatsapp.net`]
    })
  }
}

