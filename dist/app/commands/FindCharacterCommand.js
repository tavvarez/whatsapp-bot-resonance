import { FindCharacterUseCase } from '../usecases/FindCharacterUseCase.js';
import { BaileysClient } from '../../infra/whatsapp/BaileysClient.js';
import { normalizeText } from '../../shared/utils/normalizeText.js';
export class FindCharacterCommand {
    constructor(useCase, whatsapp) {
        this.useCase = useCase;
        this.whatsapp = whatsapp;
    }
    async execute({ characterName, chatId }) {
        const normalizedName = normalizeText(characterName);
        const character = await this.useCase.execute(normalizedName);
        if (!character) {
            await this.whatsapp.sendMessage(chatId, {
                text: `Char: *${characterName}*, não encontrado.`
            });
            return;
        }
        const jid = `${character.phoneNumber}@s.whatsapp.net`;
        await this.whatsapp.sendMessage(chatId, {
            text: `${character.type === 'MAIN' ? 'Char Main' : 'Maker'} encontrado: @${character.phoneNumber}`,
            mentions: [`${character.phoneNumber}@s.whatsapp.net`]
        });
    }
}
//# sourceMappingURL=FindCharacterCommand.js.map