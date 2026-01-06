import type { Command, CommandContext } from '../../domain/commands/Command.js';
/**
 * Parser de comandos extensível.
 * Permite registrar comandos dinamicamente e roteia mensagens para o comando correto.
 */
export declare class CommandParser {
    private commands;
    private prefix;
    constructor(prefix?: string);
    /**
     * Registra um comando no parser.
     * Também registra os aliases, se houver.
     */
    register(command: Command): this;
    /**
     * Registra múltiplos comandos de uma vez.
     */
    registerAll(...commands: Command[]): this;
    /**
     * Retorna lista de comandos registrados (sem duplicatas de aliases).
     */
    getCommands(): Command[];
    /**
     * Processa uma mensagem e executa o comando correspondente.
     */
    handle(ctx: CommandContext): Promise<void>;
}
//# sourceMappingURL=CommandParser.d.ts.map