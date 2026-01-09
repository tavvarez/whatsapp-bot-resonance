import { BaileysClient } from '../../infra/whatsapp/BaileysClient.js'
import { GroupGuard } from './GroupGuard.js'
import { CommandParser } from '../commands/CommandParser.js'
import type { CommandContext } from '../../domain/commands/Command.js'
import { logger } from '../../shared/utils/logger.js'

export class MessageListener {
  private lastMessageTime = Date.now()
  private watchdogInterval: NodeJS.Timeout | undefined = undefined

  constructor(
    private whatsapp: BaileysClient,
    private groupGuard: GroupGuard,
    private parser: CommandParser
  ) {}

  listen() {
    logger.info('🎧 Iniciando MessageListener...')
    
    this.whatsapp.onMessage(async (msg) => {
      try {
        // Atualiza timestamp da última mensagem recebida
        this.lastMessageTime = Date.now()
        
        const chatId = msg.key.remoteJid!
        const jid = msg.key.remoteJid
        const isGroup = jid?.endsWith('@g.us')

        // Log de debug para ver o que está chegando
        logger.debug(`📨 Mensagem recebida - Group ID: ${chatId}, IsGroup: ${isGroup}`)

        // Aguarda verificação assíncrona do grupo
        const isAllowed = await this.groupGuard.isAllowed(chatId)
        if (!isAllowed) {
          logger.debug(`🚫 Grupo não permitido pelo GroupGuard: ${chatId}`)
          return
        }

        const text =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text

        if (!text) {
          logger.debug(`⚠️ Mensagem sem texto`)
          return
        }

        logger.debug(`📝 Texto da mensagem: ${text}`)

        // Extrai número de telefone do sender
        const sender = this.extractPhoneNumber(msg)
        
        if (!sender) {
          logger.warn(`⚠️ Não foi possível extrair número do sender`)
          logger.debug(`Debug - participant: ${msg.key.participant}, remoteJid: ${msg.key.remoteJid}`)
          return
        }

        logger.debug(`👤 Sender extraído: ${sender}`)
        logger.debug(`📛 pushName: ${msg.pushName}`)

        const context: CommandContext = {
          text,
          chatId,
          sender
        }

        if (msg.pushName) {
          context.senderName = msg.pushName
        }

        await this.parser.handle(context)
      } catch (error) {
        logger.error('❌ Erro crítico ao processar mensagem:', {
          error,
          message: msg.key,
          stack: error instanceof Error ? error.stack : undefined
        })
        // NÃO deixa o erro matar o listener
      }
    })
    
    logger.info('✅ MessageListener registrado com sucesso')
    
    // Inicia o watchdog para monitorar se o listener está vivo
    this.startWatchdog()
  }

  /**
   * Watchdog que monitora se o listener está recebendo mensagens.
   * Alerta se passar muito tempo sem receber nenhuma mensagem.
   */
  private startWatchdog(): void {
    // Limpa watchdog anterior se existir
    if (this.watchdogInterval) {
      clearInterval(this.watchdogInterval)
    }

    this.watchdogInterval = setInterval(() => {
      const timeSinceLastMessage = Date.now() - this.lastMessageTime
      const minutes = Math.floor(timeSinceLastMessage / 60000)
      
      if (minutes > 30) {
        logger.warn(`⚠️ ALERTA: Nenhuma mensagem recebida há ${minutes} minutos!`)
        logger.warn(`⚠️ O listener pode estar morto. Considere reiniciar o bot.`)
        logger.warn(`⚠️ Status da conexão: ${this.whatsapp.getConnectionStatus() ? 'Conectado' : 'Desconectado'}`)
      } else if (minutes > 15) {
        logger.info(`ℹ️ Última mensagem recebida há ${minutes} minutos`)
      }
    }, 5 * 60 * 1000) // Verifica a cada 5 minutos

    logger.info('🐕 Watchdog iniciado (verifica a cada 5 minutos)')
  }

  /**
   * Para o watchdog (útil para testes)
   */
  stopWatchdog(): void {
    if (this.watchdogInterval) {
      clearInterval(this.watchdogInterval)
      this.watchdogInterval = undefined
      logger.info('🛑 Watchdog parado')
    }
  }

  /**
   * Extrai o número de telefone do remetente da mensagem.
   * Lida com diferentes formatos do WhatsApp (JID normal e LID).
   */
  private extractPhoneNumber(msg: any): string | null {
    // Log completo da estrutura para debug
    logger.debug('🔍 Debug completo da mensagem:', {
      participant: msg.key.participant,
      remoteJid: msg.key.remoteJid,
      fromMe: msg.key.fromMe,
      pushName: msg.pushName,
      verifiedBizName: msg.verifiedBizName
    })

    // Em grupos: participant, em privado: remoteJid
    const rawJid = msg.key.participant || msg.key.remoteJid
    
    if (!rawJid) {
      logger.warn('❌ Nenhum JID encontrado na mensagem')
      return null
    }

    logger.debug(`📱 JID bruto: ${rawJid}`)

    // Se o participant contém @s.whatsapp.net, é o formato antigo (correto)
    if (rawJid.includes('@s.whatsapp.net')) {
      const phoneNumber = rawJid.replace('@s.whatsapp.net', '')
      logger.debug(`✅ Número extraído (formato antigo): ${phoneNumber}`)
      return phoneNumber
    }

    // Se contém @lid, é o novo formato (problema)
    if (rawJid.includes('@lid')) {
      const lid = rawJid.replace('@lid', '')
      logger.warn(`⚠️ LID detectado: ${lid}`)
      logger.debug(`pushName: ${msg.pushName}`)
      
      // Tenta pegar do verifiedBizName ou outros campos
      if (msg.verifiedBizName) {
        logger.debug(`verifiedBizName: ${msg.verifiedBizName}`)
      }
      
      // Por enquanto, retorna o LID mesmo (você pode cadastrar no banco)
      // Futuramente, podemos criar um mapeamento LID -> Phone
      return lid
    }

    // Formato sem sufixo (remove @g.us se tiver)
    const cleaned = rawJid.replace('@g.us', '')
    logger.debug(`🔧 JID limpo: ${cleaned}`)
    
    return cleaned
  }
}
