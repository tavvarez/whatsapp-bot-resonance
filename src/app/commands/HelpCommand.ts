import type { Command, CommandContext } from '../../domain/commands/Command.js'
import type { MessageSender } from '../../domain/services/MessageSender.js'

export class HelpCommand implements Command {
  readonly name = 'help'
  readonly description = 'Mostra a lista de comandos disponíveis'
  readonly aliases = ['h', 'ajuda', 'comandos']

  constructor(
    private messageSender: MessageSender,
    private getCommands: () => Command[]
  ) {}

  async execute({ chatId }: CommandContext): Promise<void> {
    const commands = this.getCommands()

    const lines = [
      '📋 *Comandos disponíveis:*',
      '',
      ...commands.map(cmd => {
        const aliases = cmd.aliases?.length 
          ? ` (${cmd.aliases.join(', ')})` 
          : ''
        return `• *${cmd.name}*${aliases} - ${cmd.description}`
      })
    ]

    await this.messageSender.sendMessage(chatId, {
      text: lines.join('\n')
    })
  }
}

