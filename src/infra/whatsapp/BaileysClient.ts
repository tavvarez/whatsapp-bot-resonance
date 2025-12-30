import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  type WAMessage,
  type AnyMessageContent
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import qrcode from 'qrcode-terminal'

export class BaileysClient {
  private socket: ReturnType<typeof makeWASocket> | null = null

  async connect(): Promise<void> {
    const { state, saveCreds } = await useMultiFileAuthState('auth')

    this.socket = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      markOnlineOnConnect: true,
      emitOwnEvents: false
    })

    this.socket.ev.on('creds.update', saveCreds)

    // Retorna Promise que resolve quando conectar
    return new Promise((resolve, reject) => {
      this.socket!.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
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
          console.log('✅ WhatsApp conectado e pronto para receber mensagens')
          resolve() // <-- Resolve a Promise quando conectar
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode
          
          if (statusCode === DisconnectReason.loggedOut) {
            reject(new Error('WhatsApp deslogado. Delete a pasta auth/ e tente novamente.'))
          } else {
            console.log('🔄 Reconectando ao WhatsApp...')
            this.connect().then(resolve).catch(reject)
          }
        }
      })
    })
  }

  onMessage(callback: (message: WAMessage) => void) {
    if (!this.socket) throw new Error('Socket not initialized')

    this.socket.ev.on('messages.upsert', ({ messages, type }) => {
      if (type !== 'notify') return

      const msg = messages[0]
      if (!msg?.message) return

      callback(msg)
    })
  }

  async sendMessage(chatId: string, content: AnyMessageContent) {
    if (!this.socket) throw new Error('WhatsApp not connected')
    await this.socket.sendMessage(chatId, content)
  }
}