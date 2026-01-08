import type { Command, CommandContext } from '../../domain/commands/Command.js'
import type { BotUserRepository } from '../../domain/repositories/BotUserRepository.js'
import type { BotUser } from '../../domain/entities/BotUser.js'
import type { MessageSender } from '../../domain/services/MessageSender.js'
import { logger } from '../../shared/utils/logger.js'

/**
 * Comando para membros se auto-cadastrarem no bot.
 * Permite que usuários se registrem mesmo sem admin.
 */
export class RegisterCommand implements Command {
  readonly name = 'register'
  readonly description = 'Cadastra você como membro do bot'
  readonly aliases = ['registrar', 'cadastrar']
  readonly permission = 'any' as const
  readonly scope = 'any_group' as const

  constructor(
    private userRepo: BotUserRepository,
    private messageSender: MessageSender
  ) {}

  async execute({ chatId, sender, text, senderName }: CommandContext): Promise<void> {
    try {
      // Prioridade: 1) argumento do comando, 2) pushName, 3) fallback
      const argName = text.trim()
      const displayName = argName || senderName || 'Usuário'
      
      logger.debug(`📝 Register - argName: "${argName}", senderName: "${senderName}", final: "${displayName}"`)

      // Detecta se é LID ou phone
      const isLid = sender.length < 16
      
      // Tenta buscar usuário existente (por LID ou phone)
      const existingUser = await this.userRepo.findByPhoneOrLid(sender)

      if (existingUser) {
        // Usuário já existe
        // Se tem phone mas não tem LID, e estamos registrando com LID, atualiza
        if (existingUser.phoneNumber && !existingUser.lid && isLid) {
          await this.userRepo.updateLid(existingUser.phoneNumber, sender)
          logger.info(`✅ LID atualizado para usuário existente: ${displayName} (${sender})`)
          
          await this.messageSender.sendMessage(chatId, {
            text: [
              `✅ *Cadastro atualizado!*`,
              '',
              `Nome: *${existingUser.displayName}*`,
              `Role: *${existingUser.role}*`,
              '',
              `Seu LID foi vinculado ao cadastro existente.`
            ].join('\n')
          })
          return
        }

        // Usuário já totalmente cadastrado
        const identifier = existingUser.phoneNumber || existingUser.lid
        await this.messageSender.sendMessage(chatId, {
          text: [
            `ℹ️ *Você já está cadastrado!*`,
            '',
            `Nome: *${existingUser.displayName || 'Não definido'}*`,
            `Role: *${existingUser.role}*`,
            `ID: ${identifier}`
          ].join('\n')
        })
        return
      }

      // Novo cadastro
      const userData: Partial<BotUser> & { role: 'member' } = {
        role: 'member',
        displayName
      }

      if (isLid) {
        userData.lid = sender
        // IMPORTANTE: Tenta pegar o phone do sender se disponível
        // (em alguns casos o sender pode vir como phone mesmo em grupos com LID)
        // userData.phoneNumber deixa sem definir (opcional)
      } else {
        userData.phoneNumber = sender
        // userData.lid deixa sem definir (opcional)
      }

      const newUser = await this.userRepo.save(userData as BotUser)

      logger.info(`✅ Novo usuário registrado: ${displayName} (${sender})`)

      await this.messageSender.sendMessage(chatId, {
        text: [
          `✅ *Cadastro realizado com sucesso!*`,
          '',
          `Nome: *${newUser.displayName}*`,
          `Role: *member*`,
          '',
          `Agora você pode usar os comandos do bot!`,
          `Use *@bot help* para ver os comandos disponíveis.`
        ].join('\n')
      })
    } catch (error) {
      logger.error('Erro ao registrar usuário', error)
      await this.messageSender.sendMessage(chatId, {
        text: '❌ Erro ao realizar cadastro. Tente novamente ou contate um admin.'
      })
    }
  }
}
