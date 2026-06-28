import { MessagingAdapter, IncomingMessage, OutgoingMessage } from '../../types'
import { config } from '../../config'
import { logger } from '../../core/logger'

// Telegram Bot API (usando fetch nativo de Node 18+)
const BASE = `https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}`

export class TelegramAdapter implements MessagingAdapter {
  readonly name = 'telegram'

  async send(message: OutgoingMessage): Promise<void> {
    const res = await fetch(`${BASE}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: message.to, text: message.body }),
    })
    if (!res.ok) throw new Error(`Telegram sendMessage error: ${await res.text()}`)
    logger.debug('Mensaje enviado via Telegram', { to: message.to })
  }

  parseIncoming(rawBody: unknown): IncomingMessage {
    const body = rawBody as any
    const msg = body.message ?? body.edited_message
    return {
      id: String(msg.message_id),
      from: String(msg.chat.id),
      body: msg.text ?? '',
      timestamp: new Date(msg.date * 1000),
      channel: 'telegram',
      raw: rawBody,
    }
  }

  validateWebhook(_req: unknown): boolean {
    // Telegram usa secret_token en header X-Telegram-Bot-Api-Secret-Token
    // Implementar según necesidad del cliente
    return true
  }
}
