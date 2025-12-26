import { FindCharacterUseCase } from '../usecases/FindCharacterUseCase.js';
import { BaileysClient } from '../../infra/whatsapp/BaileysClient.js';
interface Input {
    characterName: string;
    chatId: string;
}
export declare class FindCharacterCommand {
    private useCase;
    private whatsapp;
    constructor(useCase: FindCharacterUseCase, whatsapp: BaileysClient);
    execute({ characterName, chatId }: Input): Promise<void>;
}
export {};
//# sourceMappingURL=FindCharacterCommand.d.ts.map