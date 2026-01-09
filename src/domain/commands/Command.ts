/**
 * Contexto de execução de um comando.
 * Contém informações sobre a mensagem recebida.
 */
export interface CommandContext {
  /** Texto completo da mensagem (sem o prefixo do comando) */
  text: string
  /** ID do chat de onde veio a mensagem */
  chatId: string
  /** Número do remetente (phone ou LID) */
  sender: string
  /** Nome do contato (pushName do WhatsApp) */
  senderName?: string
}

/**
 * Nível de permissão necessário para executar um comando
 */
export type CommandPermission = 'admin' | 'member' | 'any'

/**
 * Escopo do grupo onde o comando pode ser executado
 */
export type CommandScope = 'admin_group' | 'member_group' | 'any_group'

/**
 * Interface base para todos os comandos do bot.
 * Permite adicionar novos comandos de forma desacoplada com controle de permissões.
 */
export interface Command {
  /** Nome do comando (ex: "find", "add", "help") */
  readonly name: string
  
  /** Descrição para o comando de ajuda */
  readonly description: string
  
  /** Aliases opcionais (ex: "f" para "find") */
  readonly aliases?: string[]
  
  /** Nível de permissão requerido (padrão: 'member') */
  readonly permission: CommandPermission
  
  /** Escopo do grupo onde pode ser usado (padrão: 'any_group') */
  readonly scope: CommandScope
  
  /** Executa o comando */
  execute(ctx: CommandContext): Promise<void>
}

