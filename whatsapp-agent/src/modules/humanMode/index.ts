import { IncomingMessage, Session, MessagingAdapter, ConversationTurn } from '../../types'
import { getSession, saveSession } from '../../core/sessionManager'
import { config } from '../../config'
import { logger } from '../../core/logger'

export const humanSessions = new Map<string, { clientId: string; channel: string; since: Date }>()

function waLink(phone: string): string {
  const digits = phone.replace(/[^\d]/g, '')
  return `https://wa.me/${digits}`
}

function formatRecentHistory(context: ConversationTurn[], limit = 4): string {
  if (!context.length) return ''
  return context
    .slice(-limit)
    .map(t => t.role === 'user' ? `👤 ${t.content}` : `🤖 ${t.content}`)
    .join('\n')
}

/**
 * Notifica al propietario en su WhatsApp.
 *
 * El mensaje termina con el comando #bot listo para tocar y enviar
 * de un toque — sin escribir nada, sin copiar números.
 */
export async function notifyOwner(
  clientMessage: IncomingMessage,
  companyName: string,
  messaging: MessagingAdapter,
  recentContext: ConversationTurn[] = [],
  isFollowUp = false
): Promise<void> {
  const ownerPhone = config.OWNER_PHONE
  if (!ownerPhone) return

  const link = waLink(clientMessage.from)
  const historial = formatRecentHistory(recentContext)

  // Este es el comando que el propietario toca al terminar.
  // En WhatsApp aparece como texto seleccionable — un toque lo selecciona,
  // otro lo copia, y puede pegarlo o simplemente tocarlo si el cliente
  // lo ha enviado como mensaje sugerido. En la práctica basta con copiarlo.
  // Nota: WhatsApp no permite botones fuera de plantillas aprobadas por Meta,
  // pero poner el comando solo en una línea lo hace muy fácil de tocar y enviar.
  const reactivateCmd = `#bot ${clientMessage.from}`

  let text: string

  if (isFollowUp) {
    // Recordatorio — el cliente ha vuelto a escribir y sigue esperando
    text =
      `⏰ *${companyName}* — Cliente esperando\n\n` +
      `📱 ${clientMessage.from}\n` +
      `💬 "${clientMessage.body}"\n\n` +
      `👇 Abrir chat:\n${link}\n\n` +
      `Cuando termines toca aquí para reactivar el bot:\n` +
      `▶️ ${reactivateCmd}`
  } else {
    // Primera notificación con historial de contexto
    text =
      `🔔 *${companyName}* — Cliente solicita atención\n\n` +
      `📱 *${clientMessage.from}*\n\n` +
      (historial ? `📋 *Últimos mensajes:*\n${historial}\n\n` : '') +
      `👇 *Toca para abrir su chat:*\n${link}\n\n` +
      `────────────────\n` +
      `Cuando termines de atenderle,\n` +
      `toca esto para reactivar el bot:\n\n` +
      `▶️ ${reactivateCmd}`
  }

  try {
    await messaging.send({ to: ownerPhone, body: text, channel: clientMessage.channel })
    logger.info('Propietario notificado', { client: clientMessage.from, isFollowUp })
  } catch (err) {
    logger.error('Error notificando al propietario', { err })
  }
}

/**
 * Procesa comandos del propietario desde su WhatsApp.
 *
 * #bot +34666123456  → reactiva el bot para ese cliente
 * #bot               → reactiva para el último en espera
 * #humano +34666...  → pausa el bot para un cliente concreto
 * #pausa             → lista qué conversaciones están en espera
 */
export async function handleOwnerCommand(
  incoming: IncomingMessage
): Promise<{ reply: string; affectedClientId?: string } | null> {

  const text = incoming.body.trim()
  const lower = text.toLowerCase()

  // ── #bot [número] ──
  if (lower.startsWith('#bot') || lower.startsWith('/bot')) {
    const parts = text.split(/\s+/)
    let clientId = parts[1]?.trim() ?? ''

    if (!clientId) {
      const last = Array.from(humanSessions.values()).pop()
      clientId = last?.clientId ?? ''
    }

    if (!clientId) {
      return { reply: '✅ No hay conversaciones en modo humano ahora mismo.' }
    }

    const session = await getSession(clientId, incoming.channel)
    session.humanMode = false
    await saveSession(session)
    humanSessions.delete(`${incoming.channel}:${clientId}`)

    logger.info('Bot reactivado', { clientId })
    return {
      reply: `🟢 Bot reactivado para ${clientId}.\nEl agente vuelve a atenderle automáticamente.`,
      affectedClientId: clientId,
    }
  }

  // ── #humano [número] ──
  if (lower.startsWith('#humano') || lower.startsWith('/humano')) {
    const parts = text.split(/\s+/)
    const clientId = parts[1]?.trim()
    if (!clientId) {
      return { reply: 'Indica el número: *#humano +34666123456*' }
    }

    const session = await getSession(clientId, incoming.channel)
    session.humanMode = true
    await saveSession(session)
    humanSessions.set(`${incoming.channel}:${clientId}`, {
      clientId, channel: incoming.channel, since: new Date()
    })

    return {
      reply:
        `🟡 Bot pausado para ${clientId}.\n\n` +
        `👇 Abrir su chat:\n${waLink(clientId)}\n\n` +
        `Cuando termines:\n▶️ #bot ${clientId}`,
    }
  }

  // ── #pausa / #status ──
  if (lower === '#pausa' || lower === '#status') {
    if (humanSessions.size === 0) {
      return { reply: '✅ No hay conversaciones en espera ahora mismo.' }
    }
    const list = Array.from(humanSessions.values())
      .map(s => {
        const mins = Math.floor((Date.now() - s.since.getTime()) / 60000)
        return (
          `• ${waLink(s.clientId)}\n` +
          `  Esperando ${mins} min\n` +
          `  ▶️ #bot ${s.clientId}`
        )
      })
      .join('\n\n')
    return {
      reply: `🟡 *Conversaciones en espera:*\n\n${list}`
    }
  }

  return null
}

export async function activateHumanMode(
  session: Session,
  reason: 'client_request' | 'owner_command'
): Promise<void> {
  session.humanMode = true
  await saveSession(session)
  humanSessions.set(`${session.channel}:${session.userId}`, {
    clientId: session.userId,
    channel: session.channel,
    since: new Date(),
  })
  logger.info('Modo humano activado', { reason, userId: session.userId })
}
