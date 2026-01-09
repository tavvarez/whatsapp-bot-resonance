import type { Command, CommandContext } from '../../domain/commands/Command.js'
import type { MessageSender } from '../../domain/services/MessageSender.js'

export class HelpCommand implements Command {
  readonly name = 'help'
  readonly description = 'Mostra a lista de comandos disponíveis'
  readonly aliases = ['h', 'ajuda', 'comandos']
  readonly permission = 'any' as const
  readonly scope = 'any_group' as const

  constructor(
    private messageSender: MessageSender,
    private getCommands: () => Command[],
    private isUserAdmin?: (phoneNumber: string) => Promise<boolean>
  ) {}

  async execute({ chatId, sender }: CommandContext): Promise<void> {
    const allCommands = this.getCommands()

    // Filtra comandos baseado em permissão do usuário
    let commands = allCommands
    if (this.isUserAdmin) {
      const isAdmin = await this.isUserAdmin(sender)
      commands = allCommands.filter(cmd => {
        if (cmd.permission === 'any') return true
        if (cmd.permission === 'admin') return isAdmin
        if (cmd.permission === 'member') return true
        return false
      })
    }

    const lines = [
      '📋 *Comandos disponíveis:*',
      '',
      ...commands.map(cmd => {
        const aliases = cmd.aliases?.length 
          ? ` (${cmd.aliases.join(', ')})` 
          : ''
        const permissionIcon = cmd.permission === 'admin' ? '🔐 ' : ''
        return `• ${permissionIcon}*${cmd.name}*${aliases} - ${cmd.description}`
      })
    ]

    await this.messageSender.sendMessage(chatId, {
      text: lines.join('\n')
    })
  }
}

