import type { Command, CommandContext } from '../../domain/commands/Command.js'
import type { PermissionGuard } from '../bot/PermissionGuard.js'
import { logger } from '../../shared/utils/logger.js'

/**
 * Parser de comandos extensível com suporte a permissões.
 * Permite registrar comandos dinamicamente e roteia mensagens para o comando correto.
 */
export class CommandParser {
  private commands = new Map<string, Command>()
  private prefix: string
  private permissionGuard: PermissionGuard

  constructor(prefix: string, permissionGuard: PermissionGuard) {
    this.prefix = prefix
    this.permissionGuard = permissionGuard
  }

  /**
   * Registra um comando no parser.
   * Também registra os aliases, se houver.
   */
  register(command: Command): this {
    this.commands.set(command.name.toLowerCase(), command)
    
    if (command.aliases) {
      for (const alias of command.aliases) {
        this.commands.set(alias.toLowerCase(), command)
      }
    }
    
    logger.info(`📝 Comando registrado: ${command.name} [${command.permission}/${command.scope}]`)
    return this
  }

  /**
   * Registra múltiplos comandos de uma vez.
   */
  registerAll(...commands: Command[]): this {
    for (const command of commands) {
      this.register(command)
    }
    return this
  }

  /**
   * Retorna lista de comandos registrados (sem duplicatas de aliases).
   */
  getCommands(): Command[] {
    const unique = new Map<string, Command>()
    
    for (const command of this.commands.values()) {
      unique.set(command.name, command)
    }
    
    return Array.from(unique.values())
  }

  /**
   * Retorna comandos filtrados por permissão do usuário
   */
  getCommandsForUser(isAdmin: boolean): Command[] {
    return this.getCommands().filter(cmd => {
      if (cmd.permission === 'any') return true
      if (cmd.permission === 'admin') return isAdmin
      if (cmd.permission === 'member') return true // Member sempre vê member commands
      return false
    })
  }

  /**
   * Processa uma mensagem e executa o comando correspondente.
   * Verifica permissões de usuário e grupo antes de executar.
   */
  async handle(ctx: CommandContext): Promise<void> {
    const { text, chatId, sender, senderName } = ctx

    logger.debug(`🔧 CommandParser.handle - senderName: ${senderName}`)

    // Ignora mensagens que não começam com o prefixo
    if (!text.startsWith(this.prefix)) return

    // Remove o prefixo e separa o comando dos argumentos
    const withoutPrefix = text.slice(this.prefix.length).trim()
    const parts = withoutPrefix.split(/\s+/)
    const commandName = parts[0]?.toLowerCase()

    if (!commandName) return

    const command = this.commands.get(commandName)

    if (!command) {
      logger.debug(`❓ Comando desconhecido: ${commandName}`)
      return
    }

    // Verifica se usuário é admin (admins podem tudo)
    const isAdmin = await this.permissionGuard.isAdmin(sender)
    
    // Se não for admin, valida permissão normalmente
    if (!isAdmin) {
      const hasUserPermission = await this.permissionGuard.hasPermission(
        sender,
        chatId,
        command.permission
      )

      if (!hasUserPermission) {
        logger.warn(`🚫 Permissão negada: ${sender} tentou usar ${command.name}`)
        return
      }

      // Members só podem usar comandos em grupos específicos
      if (command.scope === 'member_group') {
        const isGroupAllowed = await this.permissionGuard.isGroupAllowed(
          chatId,
          'member'
        )

        if (!isGroupAllowed) {
          logger.warn(`🚫 Grupo errado: ${chatId} não é grupo member`)
          return
        }
      }
    } else {
      logger.debug(`✅ Admin detectado: ${sender} - acesso total`)
    }

    // Texto restante após o nome do comando
    const argsText = parts.slice(1).join(' ').trim()

    logger.info(`🤖 Executando: ${command.name} (${sender})`)

    const executeCtx: CommandContext = {
      text: argsText,
      chatId,
      sender
    }

    if (senderName) {
      executeCtx.senderName = senderName
    }

    await command.execute(executeCtx)
  }
}
