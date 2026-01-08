import type { Command, CommandContext } from '../../domain/commands/Command.js'
import type { BotUserRepository } from '../../domain/repositories/BotUserRepository.js'
import type { MessageSender } from '../../domain/services/MessageSender.js'

/**
 * Comando para promover um usuário a admin.
 * Apenas admins podem executar este comando.
 */
export class PromoteUserCommand implements Command {
  readonly name = 'promote'
  readonly description = 'Promove um usuário a admin (admin only)'
  readonly aliases = ['promover']
  readonly permission = 'admin' as const
  readonly scope = 'admin_group' as const

  constructor(
    private userRepo: BotUserRepository,
    private messageSender: MessageSender
  ) {}

  async execute({ text, chatId }: CommandContext): Promise<void> {
    const phoneNumber = text.trim().replace(/\D/g, '') // Remove não-dígitos

    if (!phoneNumber) {
      await this.messageSender.sendMessage(chatId, {
        text: [
          '❌ *Formato inválido*',
          '',
          'Uso: @bot promote <número>',
          '',
          'Exemplo: @bot promote 5511999999999'
        ].join('\n')
      })
      return
    }

    // Verifica se o usuário existe
    const user = await this.userRepo.findByPhoneNumber(phoneNumber)

    if (!user) {
      await this.messageSender.sendMessage(chatId, {
        text: `⚠️ Usuário ${phoneNumber} não encontrado. Ele precisa estar cadastrado primeiro.`
      })
      return
    }

    if (user.role === 'admin') {
      await this.messageSender.sendMessage(chatId, {
        text: `ℹ️ ${user.displayName || phoneNumber} já é admin.`
      })
      return
    }

    // Promove a admin
    await this.userRepo.updateRole(phoneNumber, 'admin')

    await this.messageSender.sendMessage(chatId, {
      text: [
        `✅ *Usuário promovido a admin!*`,
        '',
        `Número: ${phoneNumber}`,
        `Nome: ${user.displayName || 'Não definido'}`,
        `Nova role: *ADMIN*`
      ].join('\n')
    })
  }
}
