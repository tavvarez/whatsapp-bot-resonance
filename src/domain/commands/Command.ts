/**
 * Contexto de execução de um comando.
 * Contém informações sobre a mensagem recebida.
 */
export interface CommandContext {
  /** Texto completo da mensagem (sem o prefixo do comando) */
  text: string
  /** ID do chat de onde veio a mensagem */
  chatId: string
  /** Número do remetente */
  sender: string
}

/**
 * Interface base para todos os comandos do bot.
 * Permite adicionar novos comandos de forma desacoplada.
 */
export interface Command {
  /** Nome do comando (ex: "find", "add", "help") */
  readonly name: string
  
  /** Descrição para o comando de ajuda */
  readonly description: string
  
  /** Aliases opcionais (ex: "f" para "find") */
  readonly aliases?: string[]
  
  /** Executa o comando */
  execute(ctx: CommandContext): Promise<void>
}

