/**
 * Setup do sistema de comandos do bot.
 */

import { CommandParser } from '../app/commands/CommandParser.js'
import { FindCharacterCommand } from '../app/commands/FindCharacterCommand.js'
import { AddCharacterCommand } from '../app/commands/AddCharacterCommand.js'
import { HelpCommand } from '../app/commands/HelpCommand.js'
import { container } from './container.js'

/**
 * Configura o parser de comandos e registra todos os comandos disponíveis.
 */
export function setupCommands(): CommandParser {
  const { whatsapp, characterRepository, findCharacterUseCase } = container

  const parser = new CommandParser('@bot')

  // Comandos de personagens
  const findCommand = new FindCharacterCommand(findCharacterUseCase, whatsapp)
  const addCommand = new AddCharacterCommand(characterRepository, whatsapp)

  // Comando de ajuda (precisa do parser para listar comandos)
  const helpCommand = new HelpCommand(whatsapp, () => parser.getCommands())

  // Registra todos os comandos
  parser.registerAll(findCommand, addCommand, helpCommand)

  return parser
}

