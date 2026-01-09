import type { Command, CommandContext } from '../../domain/commands/Command.js'
import type { BotUserRepository } from '../../domain/repositories/BotUserRepository.js'
import type { MessageSender } from '../../domain/services/MessageSender.js'

/**
 * Comando para listar usuários do bot.
 * Apenas admins podem executar este comando.
 */
export class ListUsersCommand implements Command {
  readonly name = 'users'
  readonly description = 'Lista todos os usuários do bot (admin only)'
  readonly aliases = ['usuarios', 'lista']
  readonly permission = 'admin' as const
  readonly scope = 'admin_group' as const

  constructor(
    private userRepo: BotUserRepository,
    private messageSender: MessageSender
  ) {}

  async execute({ text, chatId }: CommandContext): Promise<void> {
    const filter = text.trim().toLowerCase()

    let users
    if (filter === 'admin' || filter === 'admins') {
      users = await this.userRepo.listByRole('admin')
    } else if (filter === 'member' || filter === 'members') {
      users = await this.userRepo.listByRole('member')
    } else {
      users = await this.userRepo.listAll()
    }

    if (users.length === 0) {
      await this.messageSender.sendMessage(chatId, {
        text: '📋 Nenhum usuário encontrado.'
      })
      return
    }

    const admins = users.filter(u => u.role === 'admin')
    const members = users.filter(u => u.role === 'member')

    const lines = ['👥 *Usuários do Bot*', '']

    if (admins.length > 0) {
      lines.push(`🔐 *Admins (${admins.length}):*`)
      admins.forEach(u => {
        lines.push(`  • ${u.displayName || u.phoneNumber} (${u.phoneNumber})`)
      })
      lines.push('')
    }

    if (members.length > 0) {
      lines.push(`👤 *Members (${members.length}):*`)
      members.forEach(u => {
        lines.push(`  • ${u.displayName || u.phoneNumber} (${u.phoneNumber})`)
      })
    }

    lines.push('')
    lines.push(`📊 Total: ${users.length} usuários`)

    await this.messageSender.sendMessage(chatId, {
      text: lines.join('\n')
    })
  }
}
