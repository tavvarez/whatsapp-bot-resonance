import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode-terminal';
import { WhatsAppError } from '../../shared/errors/index.js';
export class BaileysClient {
    constructor() {
        this.socket = null;
    }
    async connect() {
        const { state, saveCreds } = await useMultiFileAuthState('auth');
        this.socket = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            markOnlineOnConnect: true,
            emitOwnEvents: false
        });
        this.socket.ev.on('creds.update', saveCreds);
        // Retorna Promise que resolve quando conectar
        return new Promise((resolve, reject) => {
            this.socket.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
                if (qr) {
                    console.log('\n' + '═'.repeat(50));
                    console.log('📲 ESCANEIE O QR CODE PARA CONECTAR');
                    console.log('═'.repeat(50));
                    qrcode.generate(qr, { small: true });
                    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
                    console.log('\n🔗 Se o QR não aparecer, acesse:');
                    console.log(qrUrl);
                    console.log('═'.repeat(50) + '\n');
                }
                if (connection === 'open') {
                    console.log('✅ WhatsApp conectado e pronto para receber mensagens');
                    resolve(); // <-- Resolve a Promise quando conectar
                }
                if (connection === 'close') {
                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    if (statusCode === DisconnectReason.loggedOut) {
                        reject(new WhatsAppError('WhatsApp deslogado. Delete a pasta auth/ e tente novamente.'));
                    }
                    else {
                        console.log('🔄 Reconectando ao WhatsApp...');
                        this.connect().then(resolve).catch(reject);
                    }
                }
            });
        });
    }
    onMessage(callback) {
        if (!this.socket)
            throw new WhatsAppError('Socket não inicializado. Chame connect() primeiro.');
        this.socket.ev.on('messages.upsert', ({ messages, type }) => {
            if (type !== 'notify')
                return;
            const msg = messages[0];
            if (!msg?.message)
                return;
            callback(msg);
        });
    }
    async sendMessage(chatId, content) {
        if (!this.socket)
            throw new WhatsAppError('WhatsApp não conectado');
        try {
            await this.socket.sendMessage(chatId, content);
        }
        catch (error) {
            throw new WhatsAppError('Falha ao enviar mensagem', error);
        }
    }
}
//# sourceMappingURL=BaileysClient.js.map