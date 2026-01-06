import { normalizeText } from '../../shared/utils/normalizeText.js';
export class FindCharacterCommand {
    constructor(useCase, messageSender) {
        this.useCase = useCase;
        this.messageSender = messageSender;
        this.name = 'find';
        this.description = 'Busca informações de um personagem';
        this.aliases = ['f', 'buscar', 'char'];
    }
    async execute({ text, chatId }) {
        const characterName = text.trim();
        if (!characterName) {
            await this.messageSender.sendMessage(chatId, {
                text: 'Uso: @bot find <nome do personagem>'
            });
            return;
        }
        const normalizedName = normalizeText(characterName);
        const character = await this.useCase.execute(normalizedName);
        if (!character) {
            await this.messageSender.sendMessage(chatId, {
                text: `Char: *${characterName}*, não encontrado.`
            });
            return;
        }
        await this.messageSender.sendMessage(chatId, {
            text: `${character.type === 'MAIN' ? 'Char Main' : 'Maker'} encontrado: @${character.phoneNumber}`,
            mentions: [`${character.phoneNumber}@s.whatsapp.net`]
        });
    }
}
// adicionar novos comandos:
// export class MeuComando implements Command {
//   readonly name = 'meucomando'
//   readonly description = 'Faz algo legal'
//   readonly aliases = ['mc']
//   async execute({ text, chatId }: CommandContext): Promise<void> {
//     // lógica aqui
//   }
// }
// // No index.ts:
// parser.register(new MeuComando())
//# sourceMappingURL=FindCharacterCommand.js.map