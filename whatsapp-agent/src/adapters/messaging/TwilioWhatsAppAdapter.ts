import twilio from 'twilio'
import { MessagingAdapter, IncomingMessage, OutgoingMessage } from '../../types'
import { config } from '../../config'
import { logger } from '../../core/logger'
import { Request } from 'express'

export class TwilioWhatsAppAdapter implements MessagingAdapter {
  readonly name = 'twilio_whatsapp'
  private client: twilio.Twilio

  constructor() {
    if (!config.TWILIO_ACCOUNT_SID || !config.TWILIO_AUTH_TOKEN) {
      throw new Error('Twilio: faltan TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN')
    }
    this.client = twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN)
  }

  async send(message: OutgoingMessage): Promise<void> {
    await this.client.messages.create({
      from: `whatsapp:${config.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${message.to}`,
      body: message.body,
    })
    logger.debug('Mensaje enviado via Twilio', { to: message.to })
  }

  parseIncoming(rawBody: unknown): IncomingMessage {
    const body = rawBody as Record<string, string>
    return {
      id: body.MessageSid,
      from: body.From.replace('whatsapp:', ''),
      body: body.Body,
      timestamp: new Date(),
      channel: 'whatsapp',
      raw: rawBody,
    }
  }

  validateWebhook(req: unknown): boolean {
    const r = req as Request
    const signature = r.headers['x-twilio-signature'] as string
    const url = `${r.protocol}://${r.get('host')}${r.originalUrl}`
    return twilio.validateRequest(
      config.TWILIO_AUTH_TOKEN!,
      signature,
      url,
      r.body
    )
  }
}
