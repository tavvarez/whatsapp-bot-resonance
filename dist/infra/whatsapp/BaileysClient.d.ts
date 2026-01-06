import { type WAMessage } from '@whiskeysockets/baileys';
import type { MessageSender, MessageContent } from '../../domain/services/MessageSender.js';
export declare class BaileysClient implements MessageSender {
    private socket;
    connect(): Promise<void>;
    onMessage(callback: (message: WAMessage) => void): void;
    sendMessage(chatId: string, content: MessageContent): Promise<void>;
}
//# sourceMappingURL=BaileysClient.d.ts.map