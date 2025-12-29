import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  type WAMessage,
  proto,
  type AnyMessageContent
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import qrcode from 'qrcode-terminal'

export class BaileysClient {
  private socket: ReturnType<typeof makeWASocket> | null = null

  async connect() {
    const { state, saveCreds } = await useMultiFileAuthState('auth')

    this.socket = makeWASocket({
      auth: state,
      printQRInTerminal: true,
      markOnlineOnConnect: true,
      emitOwnEvents: false
    })

    this.socket.ev.on('creds.update', saveCreds)

    this.socket.ev.on('connection.update', ({ connection, lastDisconnect,qr }) => {
      if (connection === 'open') {
        console.log('✅ WhatsApp conectado e pronto para receber mensagens')
      }

      if (qr) {
        console.clear()
        console.log('📲 Escaneie o QR Code abaixo com o WhatsApp:')
        qrcode.generate(qr, { small: true })
      }

      if (
        connection === 'close' &&
        (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
      ) {
        console.log('🔄 Reconectando ao WhatsApp...')
        this.connect()
      }
    })
  }

  onMessage(callback: (message: WAMessage) => void) {
    if (!this.socket) throw new Error('Socket not initialized')

    this.socket.ev.on('messages.upsert', ({ messages, type }) => {
      // 🔑 SOMENTE mensagens novas
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
