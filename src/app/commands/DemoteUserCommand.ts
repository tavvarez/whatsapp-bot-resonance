import type { Command, CommandContext } from '../../domain/commands/Command.js'
import type { BotUserRepository } from '../../domain/repositories/BotUserRepository.js'
import type { MessageSender } from '../../domain/services/MessageSender.js'

/**
 * Comando para rebaixar um admin a member.
 * Apenas admins podem executar este comando.
 */
export class DemoteUserCommand implements Command {
  readonly name = 'demote'
  readonly description = 'Remove privilégios de admin de um usuário (admin only)'
  readonly aliases = ['rebaixar']
  readonly permission = 'admin' as const
  readonly scope = 'admin_group' as const

  constructor(
    private userRepo: BotUserRepository,
    private messageSender: MessageSender
  ) {}

  async execute({ text, chatId }: CommandContext): Promise<void> {
    const phoneNumber = text.trim().replace(/\D/g, '')

    if (!phoneNumber) {
      await this.messageSender.sendMessage(chatId, {
        text: [
          '❌ *Formato inválido*',
          '',
          'Uso: @bot demote <número>',
          '',
          'Exemplo: @bot demote 5511999999999'
        ].join('\n')
      })
      return
    }

    const user = await this.userRepo.findByPhoneNumber(phoneNumber)

    if (!user) {
      await this.messageSender.sendMessage(chatId, {
        text: `⚠️ Usuário ${phoneNumber} não encontrado.`
      })
      return
    }

    if (user.role === 'member') {
      await this.messageSender.sendMessage(chatId, {
        text: `ℹ️ ${user.displayName || phoneNumber} já é member.`
      })
      return
    }

    // Rebaixa a member
    await this.userRepo.updateRole(phoneNumber, 'member')

    await this.messageSender.sendMessage(chatId, {
      text: [
        `✅ *Usuário rebaixado!*`,
        '',
        `Número: ${phoneNumber}`,
        `Nome: ${user.displayName || 'Não definido'}`,
        `Nova role: *MEMBER*`
      ].join('\n')
    })
  }
}
