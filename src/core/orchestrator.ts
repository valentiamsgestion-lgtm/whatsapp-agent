import {
  IncomingMessage, OutgoingMessage,
  MessagingAdapter, CalendarAdapter, StorageAdapter, EmailAdapter,
  Session, CompanyInfo, PricingItem
} from '../types'
import { getSession, saveSession, addTurn, isOwner } from './sessionManager'
import { classifyIntent } from './intentClassifier'
import { generateResponse } from './responseGenerator'
import { handleAppointments } from '../modules/appointments'
import { handleComplaints } from '../modules/complaints'
import {
  notifyOwner,
  handleOwnerCommand,
  activateHumanMode,
  humanSessions,
} from '../modules/humanMode'
import { logger } from './logger'

let cachedInfo: { company: CompanyInfo; pricing: PricingItem[]; at: number } | null = null
const CACHE_TTL = 5 * 60 * 1000

export interface AgentAdapters {
  messaging: MessagingAdapter
  calendar: CalendarAdapter
  storage: StorageAdapter
  email: EmailAdapter
}

async function getCompanyData(storage: StorageAdapter) {
  const now = Date.now()
  if (cachedInfo && now - cachedInfo.at < CACHE_TTL) return cachedInfo
  const [company, pricing] = await Promise.all([
    storage.getCompanyInfo(),
    storage.getPricing(),
  ])
  cachedInfo = { company, pricing, at: now }
  return cachedInfo
}

export async function processMessage(
  incoming: IncomingMessage,
  adapters: AgentAdapters
): Promise<void> {
  const { messaging, storage, calendar, email } = adapters
  const senderIsOwner = isOwner(incoming.from, incoming.channel)

  // ── PROPIETARIO ───────────────────────────────────────────────────────────
  // Todo desde su propio WhatsApp, sin apps externas.
  if (senderIsOwner) {
    const result = await handleOwnerCommand(incoming)

    if (result) {
      // Era un comando (#bot, #humano, #pausa) — responder al propietario
      await messaging.send({
        to: incoming.from,
        body: result.reply,
        channel: incoming.channel,
      })

      // Si reactivó el bot, avisamos al cliente
      if (result.affectedClientId) {
        const { company } = await getCompanyData(storage)
        await messaging.send({
          to: result.affectedClientId,
          body: `Hola de nuevo 👋 Ya estoy aquí para ayudarte. ¿En qué puedo seguir asistiendo?`,
          channel: incoming.channel,
        })
      }
    }
    // Si result es null: el propietario está escribiendo en su WhatsApp normal
    // (no un comando) — ignorar, no interferir
    return
  }

  // ── CLIENTE ───────────────────────────────────────────────────────────────
  const session = await getSession(incoming.from, incoming.channel)
  const { company, pricing } = await getCompanyData(storage)

  logger.info('Mensaje cliente', {
    from: incoming.from,
    humanMode: session.humanMode,
    preview: incoming.body.slice(0, 60),
  })

  // Bot en silencio — propietario está atendiendo
  if (session.humanMode) {
    logger.debug('Modo humano activo — bot en silencio')

    // Recordatorio al propietario si el cliente lleva más de 5 min esperando
    const waitMs = Date.now() - session.lastActivity.getTime()
    if (waitMs > 5 * 60 * 1000) {
      await notifyOwner(incoming, company.name, messaging, [], true)
    }

    // Actualizar última actividad sin responder
    session.lastActivity = new Date()
    await saveSession(session)
    return
  }

  // ── Clasificar y enrutar ──────────────────────────────────────────────────
  const { intent } = await classifyIntent(incoming.body, session.context)
  await addTurn(session, 'user', incoming.body, intent)

  logger.debug('Intent detectado', { intent })

  let reply: string

  switch (intent) {

    case 'human_request': {
      await activateHumanMode(session, 'client_request')

      reply =
        `Entendido 👋 Ahora mismo aviso a nuestro equipo y te atenderá una persona en breve.\n\n` +
        `Si tienes urgencia, también puedes llamarnos directamente al ${company.phone || 'nuestro teléfono'}.`

      // Notificar al propietario por WhatsApp — sin bloquear
      notifyOwner(incoming, company.name, messaging, session.context.slice(-6)).catch(err =>
        logger.error('Error notificando propietario', { err })
      )
      break
    }

    case 'appointment_create':
    case 'appointment_modify':
    case 'appointment_cancel':
    case 'appointment_query': {
      reply = await handleAppointments(incoming, session, intent, calendar, company, pricing)
      break
    }

    case 'complaint': {
      reply = await handleComplaints(incoming, session, email)
      break
    }

    case 'info':
    case 'pricing':
    default: {
      reply = await generateResponse(incoming.body, session.context.slice(-6), company, pricing)
    }
  }

  await addTurn(session, 'assistant', reply)
  await messaging.send({ to: incoming.from, body: reply, channel: incoming.channel })
  logger.info('Respuesta enviada', { to: incoming.from })
}

export function invalidateCompanyCache(): void {
  cachedInfo = null
  logger.info('Caché invalidada')
}
