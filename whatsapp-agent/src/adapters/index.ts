import { MessagingAdapter, CalendarAdapter, StorageAdapter, EmailAdapter } from '../types'
import { config } from '../config'
import { logger } from '../core/logger'

export async function buildAdapters(): Promise<{
  messaging: MessagingAdapter
  calendar: CalendarAdapter
  storage: StorageAdapter
  email: EmailAdapter
}> {

  // ── MENSAJERÍA ──
  let messaging: MessagingAdapter
  switch (config.MESSAGING_ADAPTER) {
    case 'twilio_whatsapp': {
      const { TwilioWhatsAppAdapter } = await import('./messaging/TwilioWhatsAppAdapter')
      messaging = new TwilioWhatsAppAdapter()
      break
    }
    case 'telegram': {
      const { TelegramAdapter } = await import('./messaging/TelegramAdapter')
      messaging = new TelegramAdapter()
      break
    }
    case 'meta_whatsapp': {
      // Añadir MetaWhatsAppAdapter cuando se necesite
      throw new Error('Meta WhatsApp adapter pendiente de implementar')
    }
    default:
      throw new Error(`Adaptador de mensajería no reconocido: ${config.MESSAGING_ADAPTER}`)
  }

  // ── CALENDARIO ──
  let calendar: CalendarAdapter
  switch (config.CALENDAR_ADAPTER) {
    case 'google_calendar': {
      const { GoogleCalendarAdapter } = await import('./calendar/GoogleCalendarAdapter')
      calendar = new GoogleCalendarAdapter()
      break
    }
    case 'mock': {
      const { MockCalendarAdapter } = await import('./calendar/MockCalendarAdapter')
      calendar = new MockCalendarAdapter()
      break
    }
    default:
      throw new Error(`Adaptador de calendario no reconocido: ${config.CALENDAR_ADAPTER}`)
  }

  // ── ALMACENAMIENTO ──
  let storage: StorageAdapter
  switch (config.STORAGE_ADAPTER) {
    case 'google_sheets': {
      const { GoogleSheetsAdapter } = await import('./storage/GoogleSheetsAdapter')
      storage = new GoogleSheetsAdapter()
      break
    }
    case 'local_json': {
      const { LocalJsonAdapter } = await import('./storage/LocalJsonAdapter')
      storage = new LocalJsonAdapter()
      break
    }
    default:
      throw new Error(`Adaptador de storage no reconocido: ${config.STORAGE_ADAPTER}`)
  }

  // ── EMAIL ──
  let email: EmailAdapter
  switch (config.EMAIL_ADAPTER) {
    case 'smtp':
    case 'gmail': {  // Gmail también puede usarse por SMTP con App Password
      const { SmtpEmailAdapter } = await import('./email/SmtpEmailAdapter')
      email = new SmtpEmailAdapter()
      break
    }
    default:
      throw new Error(`Adaptador de email no reconocido: ${config.EMAIL_ADAPTER}`)
  }

  logger.info('Adaptadores cargados', {
    messaging: messaging.name,
    calendar:  calendar.name,
    storage:   storage.name,
    email:     email.name,
  })

  return { messaging, calendar, storage, email }
}
