/**
 * Interface para envio de mensagens.
 * Permite desacoplar a lógica de negócio da implementação específica (WhatsApp, Telegram, etc.)
 */
export interface MessageContent {
  text: string
  mentions?: string[]
}

export interface MessageSender {
  sendMessage(chatId: string, content: MessageContent): Promise<void>
}

