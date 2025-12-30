import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CommandParser } from '../../app/commands/CommandParser.js'
import type { Command, CommandContext } from '../../domain/commands/Command.js'

// Mock do logger
vi.mock('../../shared/utils/logger.js', () => ({
  log: vi.fn(),
  logError: vi.fn()
}))

describe('CommandParser', () => {
  let parser: CommandParser

  const createMockCommand = (name: string, aliases?: string[]): Command => {
    if (aliases) {
      return {
        name,
        description: `Comando ${name}`,
        aliases,
        execute: vi.fn()
      }
    }
    
    return {
      name,
      description: `Comando ${name}`,
      execute: vi.fn()
    }
  }

  beforeEach(() => {
    parser = new CommandParser('@bot')
  })

  describe('register', () => {
    it('deve registrar um comando pelo nome', () => {
      const command = createMockCommand('find')
      parser.register(command)

      expect(parser.getCommands()).toHaveLength(1)
      expect(parser.getCommands()[0]?.name).toBe('find')
    })

    it('deve registrar comandos em lowercase', () => {
      const command = createMockCommand('FIND')
      parser.register(command)

      const commands = parser.getCommands()
      expect(commands[0]?.name).toBe('FIND')
    })

    it('deve registrar aliases do comando', async () => {
      const command = createMockCommand('find', ['f', 'buscar'])
      parser.register(command)

      // Deve funcionar com o alias
      await parser.handle({ text: '@bot f Foxzinho', chatId: 'chat1', sender: 'user1' })
      expect(command.execute).toHaveBeenCalled()
    })

    it('deve permitir encadeamento', () => {
      const cmd1 = createMockCommand('find')
      const cmd2 = createMockCommand('add')

      const result = parser.register(cmd1).register(cmd2)

      expect(result).toBe(parser)
      expect(parser.getCommands()).toHaveLength(2)
    })
  })

  describe('registerAll', () => {
    it('deve registrar múltiplos comandos', () => {
      const cmd1 = createMockCommand('find')
      const cmd2 = createMockCommand('add')
      const cmd3 = createMockCommand('help')

      parser.registerAll(cmd1, cmd2, cmd3)

      expect(parser.getCommands()).toHaveLength(3)
    })
  })

  describe('getCommands', () => {
    it('deve retornar comandos sem duplicatas de aliases', () => {
      const command = createMockCommand('find', ['f', 'buscar', 'char'])
      parser.register(command)

      // Apenas 1 comando, não 4 (nome + 3 aliases)
      expect(parser.getCommands()).toHaveLength(1)
    })
  })

  describe('handle', () => {
    it('deve ignorar mensagens que não começam com prefixo', async () => {
      const command = createMockCommand('find')
      parser.register(command)

      await parser.handle({ text: 'find Foxzinho', chatId: 'chat1', sender: 'user1' })

      expect(command.execute).not.toHaveBeenCalled()
    })

    it('deve executar comando correto', async () => {
      const findCmd = createMockCommand('find')
      const addCmd = createMockCommand('add')
      parser.registerAll(findCmd, addCmd)

      await parser.handle({ text: '@bot find Foxzinho', chatId: 'chat1', sender: 'user1' })

      expect(findCmd.execute).toHaveBeenCalled()
      expect(addCmd.execute).not.toHaveBeenCalled()
    })

    it('deve passar argumentos corretos para o comando', async () => {
      const command = createMockCommand('find')
      parser.register(command)

      await parser.handle({ 
        text: '@bot find Be Na Ti', 
        chatId: 'chat123', 
        sender: 'user456' 
      })

      expect(command.execute).toHaveBeenCalledWith({
        text: 'Be Na Ti',
        chatId: 'chat123',
        sender: 'user456'
      })
    })

    it('deve funcionar com comando sem argumentos', async () => {
      const command = createMockCommand('help')
      parser.register(command)

      await parser.handle({ text: '@bot help', chatId: 'chat1', sender: 'user1' })

      expect(command.execute).toHaveBeenCalledWith({
        text: '',
        chatId: 'chat1',
        sender: 'user1'
      })
    })

    it('deve ser case insensitive para comandos', async () => {
      const command = createMockCommand('find')
      parser.register(command)

      await parser.handle({ text: '@bot FIND Foxzinho', chatId: 'chat1', sender: 'user1' })

      expect(command.execute).toHaveBeenCalled()
    })

    it('não deve executar comando desconhecido', async () => {
      const command = createMockCommand('find')
      parser.register(command)

      await parser.handle({ text: '@bot unknown arg', chatId: 'chat1', sender: 'user1' })

      expect(command.execute).not.toHaveBeenCalled()
    })

    it('deve ignorar mensagem com apenas prefixo', async () => {
      const command = createMockCommand('find')
      parser.register(command)

      await parser.handle({ text: '@bot', chatId: 'chat1', sender: 'user1' })
      await parser.handle({ text: '@bot ', chatId: 'chat1', sender: 'user1' })

      expect(command.execute).not.toHaveBeenCalled()
    })

    it('deve funcionar com prefixo customizado', async () => {
      const customParser = new CommandParser('!')
      const command = createMockCommand('help')
      customParser.register(command)

      await customParser.handle({ text: '!help', chatId: 'chat1', sender: 'user1' })

      expect(command.execute).toHaveBeenCalled()
    })

    it('deve lidar com múltiplos espaços entre argumentos', async () => {
      const command = createMockCommand('find')
      parser.register(command)

      await parser.handle({ 
        text: '@bot   find   Be   Na   Ti', 
        chatId: 'chat1', 
        sender: 'user1' 
      })

      expect(command.execute).toHaveBeenCalledWith({
        text: 'Be Na Ti',
        chatId: 'chat1',
        sender: 'user1'
      })
    })
  })
})

