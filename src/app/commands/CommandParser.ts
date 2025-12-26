import { FindCharacterCommand } from './FindCharacterCommand.js'

interface CommandContext {
  text: string
  chatId: string
  sender: string
}

export class CommandParser {
  constructor(private findCharacterCommand: FindCharacterCommand) {}

  async handle(ctx: CommandContext) {
    if (!ctx.text.startsWith('@bot')) return

    const parts = ctx.text.split(' ')
    if (parts.length < 2) return

    const characterName = parts.slice(1).join(' ').trim()

    await this.findCharacterCommand.execute({
      characterName,
      chatId: ctx.chatId
    })
  }
}
