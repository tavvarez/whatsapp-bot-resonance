import { FindCharacterCommand } from './FindCharacterCommand.js';
interface CommandContext {
    text: string;
    chatId: string;
    sender: string;
}
export declare class CommandParser {
    private findCharacterCommand;
    constructor(findCharacterCommand: FindCharacterCommand);
    handle(ctx: CommandContext): Promise<void>;
}
export {};
//# sourceMappingURL=CommandParser.d.ts.map