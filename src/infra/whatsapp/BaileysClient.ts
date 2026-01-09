import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  type WAMessage
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import qrcode from 'qrcode-terminal'
import type { MessageSender, MessageContent } from '../../domain/services/MessageSender.js'
import { WhatsAppError } from '../../shared/errors/index.js'
import { logger } from '../../shared/utils/logger.js'

export class BaileysClient implements MessageSender {
  private socket: ReturnType<typeof makeWASocket> | null = null
  private messageHandlers: Array<(msg: WAMessage) => void> = []
  private isConnected = false

  async connect(): Promise<void> {
    const { state, saveCreds } = await useMultiFileAuthState('auth')

    this.socket = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      markOnlineOnConnect: true,
      emitOwnEvents: false,
      // Configurações de keepalive e timeout
      keepAliveIntervalMs: 30000, // Ping a cada 30s
      connectTimeoutMs: 60000, // Timeout de 60s
      defaultQueryTimeoutMs: 60000,
      retryRequestDelayMs: 250
    })

    this.socket.ev.on('creds.update', saveCreds)

    // Retorna Promise que resolve quando conectar
    return new Promise((resolve, reject) => {
      this.socket!.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
        logger.info(`🔌 Status da conexão: ${connection}`)
        
        if (qr) {
          console.log('\n' + '═'.repeat(50))
          console.log('📲 ESCANEIE O QR CODE PARA CONECTAR')
          console.log('═'.repeat(50))
          
          qrcode.generate(qr, { small: true })
          
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`
          console.log('\n🔗 Se o QR não aparecer, acesse:')
          console.log(qrUrl)
          console.log('═'.repeat(50) + '\n')
        }

        if (connection === 'open') {
          this.isConnected = true
          logger.info('✅ WhatsApp conectado e pronto para receber mensagens')
          
          // Re-registra todos os listeners de mensagem após reconexão
          this.registerMessageListeners()
          
          resolve()
        }

        if (connection === 'close') {
          this.isConnected = false
          logger.warn('❌ Conexão fechada! Tentando reconectar...')
          
          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
          
          if (statusCode === DisconnectReason.loggedOut) {
            logger.error('❌ WhatsApp deslogado!')
            reject(new WhatsAppError('WhatsApp deslogado. Delete a pasta auth/ e tente novamente.'))
          } else {
            logger.info('🔄 Reconectando ao WhatsApp...')
            this.connect().then(resolve).catch(reject)
          }
        }
      })
    })
  }

  /**
   * Registra todos os message listeners.
   * Chamado após conexão/reconexão para garantir que os listeners estão ativos.
   */
  private registerMessageListeners(): void {
    if (!this.socket) {
      logger.warn('⚠️ Socket não inicializado, não é possível registrar listeners')
      return
    }

    // Remove listeners antigos para evitar duplicação
    this.socket.ev.removeAllListeners('messages.upsert')

    // Registra o listener de mensagens
    this.socket.ev.on('messages.upsert', ({ messages, type }) => {
      try {
        if (type !== 'notify') return

        const msg = messages[0]
        if (!msg?.message) return

        // Log de debug para cada mensagem
        logger.debug(`📨 [${new Date().toISOString()}] Mensagem recebida de ${msg.key.remoteJid}`)

        // Chama todos os handlers registrados
        for (const handler of this.messageHandlers) {
          try {
            handler(msg)
          } catch (error) {
            logger.error('❌ Erro em message handler:', error)
          }
        }
      } catch (error) {
        logger.error('❌ Erro crítico no listener de mensagens:', error)
      }
    })

    logger.info(`✅ Message listeners registrados (${this.messageHandlers.length} handlers)`)
  }

  onMessage(callback: (message: WAMessage) => void) {
    if (!this.socket) {
      throw new WhatsAppError('Socket não inicializado. Chame connect() primeiro.')
    }

    // Adiciona o handler à lista
    this.messageHandlers.push(callback)
    logger.info(`📝 Handler de mensagem registrado (total: ${this.messageHandlers.length})`)

    // Se já está conectado, registra os listeners imediatamente
    if (this.isConnected) {
      this.registerMessageListeners()
    }
  }

  /**
   * Retorna o status da conexão
   */
  getConnectionStatus(): boolean {
    return this.isConnected
  }

  async sendMessage(chatId: string, content: MessageContent): Promise<void> {
    if (!this.socket) throw new WhatsAppError('WhatsApp não conectado')
    
    try {
      await this.socket.sendMessage(chatId, content)
    } catch (error) {
      throw new WhatsAppError('Falha ao enviar mensagem', error)
    }
  }
}