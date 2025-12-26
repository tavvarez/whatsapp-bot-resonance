import { type WAMessage, type AnyMessageContent } from '@whiskeysockets/baileys';
export declare class BaileysClient {
    private socket;
    connect(): Promise<void>;
    onMessage(callback: (message: WAMessage) => void): void;
    sendMessage(chatId: string, content: AnyMessageContent): Promise<void>;
}
//# sourceMappingURL=BaileysClient.d.ts.map