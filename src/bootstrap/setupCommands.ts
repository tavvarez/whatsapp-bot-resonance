/**
 * Setup do sistema de comandos do bot com suporte a permissões.
 */

import { CommandParser } from '../app/commands/CommandParser.js'
import { PermissionGuard } from '../app/bot/PermissionGuard.js'
import { FindCharacterCommand } from '../app/commands/FindCharacterCommand.js'
import { AddCharacterCommand } from '../app/commands/AddCharacterCommand.js'
import { HelpCommand } from '../app/commands/HelpCommand.js'
import { PromoteUserCommand } from '../app/commands/PromoteUserCommand.js'
import { DemoteUserCommand } from '../app/commands/DemoteUserCommand.js'
import { ListUsersCommand } from '../app/commands/ListUsersCommand.js'
import { RegisterCommand } from '../app/commands/RegisterCommand.js'
import { AddHuntedGuildCommand } from '../app/commands/AddHuntedGuildCommand.js'
import { RemoveHuntedGuildCommand } from '../app/commands/RemoveHuntedGuildCommand.js'
import { ListHuntedGuildsCommand } from '../app/commands/ListHuntedGuildsCommand.js'
import { ListWorldsCommand } from '../app/commands/ListWorldsCommand.js'
import { container } from './container.js'

/**
 * Configura o parser de comandos e registra todos os comandos disponíveis.
 */
export function setupCommands(): CommandParser {
  const {
    whatsapp,
    characterRepository,
    findCharacterUseCase,
    botUserRepository,
    botGroupRepository,
    gameServerRepository,
    gameWorldRepository,
    huntedGuildRepository
  } = container

  // Cria o guard de permissões
  const permissionGuard = new PermissionGuard(
    botUserRepository,
    botGroupRepository
  )

  // Cria o parser com o guard
  const parser = new CommandParser('@bot', permissionGuard)

  // Comandos públicos (any)
  const registerCommand = new RegisterCommand(botUserRepository, whatsapp)
  const helpCommand = new HelpCommand(
    whatsapp,
    () => parser.getCommands(),
    (phoneNumber) => permissionGuard.isAdmin(phoneNumber)
  )

  // Comandos de membros
  const findCommand = new FindCharacterCommand(findCharacterUseCase, whatsapp)

  // Comandos de admin
  const addCommand = new AddCharacterCommand(characterRepository, whatsapp)
  const promoteCommand = new PromoteUserCommand(botUserRepository, whatsapp)
  const demoteCommand = new DemoteUserCommand(botUserRepository, whatsapp)
  const listUsersCommand = new ListUsersCommand(botUserRepository, whatsapp)
  
  // Comandos de hunted guilds (multi-tenancy)
  const addHuntedCommand = new AddHuntedGuildCommand(
    huntedGuildRepository,
    gameServerRepository,
    gameWorldRepository,
    botGroupRepository,
    whatsapp
  )
  const removeHuntedCommand = new RemoveHuntedGuildCommand(
    huntedGuildRepository,
    botGroupRepository,
    whatsapp
  )
  const listHuntedCommand = new ListHuntedGuildsCommand(
    huntedGuildRepository,
    gameWorldRepository,
    gameServerRepository,
    botGroupRepository,
    whatsapp
  )
  const listWorldsCommand = new ListWorldsCommand(
    gameServerRepository,
    gameWorldRepository,
    whatsapp
  )

  // Registra todos os comandos
  parser.registerAll(
    // Public
    registerCommand,
    helpCommand,
    // Members
    findCommand,
    // Admins
    addCommand,
    promoteCommand,
    demoteCommand,
    listUsersCommand,
    // Multi-tenancy (hunted guilds)
    addHuntedCommand,
    removeHuntedCommand,
    listHuntedCommand,
    listWorldsCommand
  )

  return parser
}

