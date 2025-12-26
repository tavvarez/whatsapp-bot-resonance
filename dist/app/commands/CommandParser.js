import { FindCharacterCommand } from './FindCharacterCommand.js';
export class CommandParser {
    constructor(findCharacterCommand) {
        this.findCharacterCommand = findCharacterCommand;
    }
    async handle(ctx) {
        if (!ctx.text.startsWith('@bot'))
            return;
        const parts = ctx.text.split(' ');
        if (parts.length < 2)
            return;
        const characterName = parts.slice(1).join(' ').trim();
        await this.findCharacterCommand.execute({
            characterName,
            chatId: ctx.chatId
        });
    }
}
//# sourceMappingURL=CommandParser.js.map