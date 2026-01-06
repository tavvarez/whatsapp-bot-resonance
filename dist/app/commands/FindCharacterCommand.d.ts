import type { Command, CommandContext } from '../../domain/commands/Command.js';
import type { FindCharacterUseCase } from '../usecases/FindCharacterUseCase.js';
import type { MessageSender } from '../../domain/services/MessageSender.js';
export declare class FindCharacterCommand implements Command {
    private useCase;
    private messageSender;
    readonly name = "find";
    readonly description = "Busca informa\u00E7\u00F5es de um personagem";
    readonly aliases: string[];
    constructor(useCase: FindCharacterUseCase, messageSender: MessageSender);
    execute({ text, chatId }: CommandContext): Promise<void>;
}
//# sourceMappingURL=FindCharacterCommand.d.ts.map