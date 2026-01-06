import { log } from '../../shared/utils/logger.js';
/**
 * Parser de comandos extensível.
 * Permite registrar comandos dinamicamente e roteia mensagens para o comando correto.
 */
export class CommandParser {
    constructor(prefix = '@bot') {
        this.commands = new Map();
        this.prefix = prefix;
    }
    /**
     * Registra um comando no parser.
     * Também registra os aliases, se houver.
     */
    register(command) {
        this.commands.set(command.name.toLowerCase(), command);
        if (command.aliases) {
            for (const alias of command.aliases) {
                this.commands.set(alias.toLowerCase(), command);
            }
        }
        log(`📝 Comando registrado: ${command.name}`);
        return this;
    }
    /**
     * Registra múltiplos comandos de uma vez.
     */
    registerAll(...commands) {
        for (const command of commands) {
            this.register(command);
        }
        return this;
    }
    /**
     * Retorna lista de comandos registrados (sem duplicatas de aliases).
     */
    getCommands() {
        const unique = new Map();
        for (const command of this.commands.values()) {
            unique.set(command.name, command);
        }
        return Array.from(unique.values());
    }
    /**
     * Processa uma mensagem e executa o comando correspondente.
     */
    async handle(ctx) {
        const { text, chatId, sender } = ctx;
        // Ignora mensagens que não começam com o prefixo
        if (!text.startsWith(this.prefix))
            return;
        // Remove o prefixo e separa o comando dos argumentos
        const withoutPrefix = text.slice(this.prefix.length).trim();
        const parts = withoutPrefix.split(/\s+/);
        const commandName = parts[0]?.toLowerCase();
        if (!commandName)
            return;
        const command = this.commands.get(commandName);
        if (!command) {
            log(`❓ Comando desconhecido: ${commandName}`);
            return;
        }
        // Texto restante após o nome do comando
        const argsText = parts.slice(1).join(' ').trim();
        log(`🤖 Executando comando: ${command.name} (args: "${argsText}")`);
        await command.execute({
            text: argsText,
            chatId,
            sender
        });
    }
}
//# sourceMappingURL=CommandParser.js.map