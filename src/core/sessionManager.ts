import { Session, ConversationTurn, Intent } from '../types'
import { config } from '../config'
import { logger } from './logger'

const MAX_CONTEXT_TURNS = 10

// Store en memoria (fallback si no hay Redis)
const memoryStore = new Map<string, Session>()

function sessionKey(userId: string, channel: string) {
  return `session:${channel}:${userId}`
}

export async function getSession(userId: string, channel: string): Promise<Session> {
  const key = sessionKey(userId, channel)
  const existing = memoryStore.get(key)
  if (existing) return existing

  const session: Session = {
    userId,
    channel,
    humanMode: false,
    context: [],
    state: 'idle',
    lastActivity: new Date(),
  }
  memoryStore.set(key, session)
  return session
}

export async function saveSession(session: Session): Promise<void> {
  session.lastActivity = new Date()
  const key = sessionKey(session.userId, session.channel)
  memoryStore.set(key, session)
}

export async function addTurn(
  session: Session,
  role: 'user' | 'assistant',
  content: string,
  intent?: Intent
): Promise<void> {
  const turn: ConversationTurn = {
    role,
    content,
    timestamp: new Date(),
    intent,
  }
  session.context.push(turn)

  // Mantener solo los últimos N turnos para no inflar el contexto
  if (session.context.length > MAX_CONTEXT_TURNS) {
    session.context = session.context.slice(-MAX_CONTEXT_TURNS)
  }

  await saveSession(session)
}

export function isOwner(userId: string, channel: string): boolean {
  // El propietario se identifica por su número/id configurado
  return userId === config.OWNER_PHONE
}

/** Limpia sesiones inactivas (llamar desde un cron) */
export async function cleanStaleSessions(): Promise<void> {
  const ttlMs = parseInt(config.SESSION_TTL_SECONDS) * 1000
  const now = Date.now()
  let cleaned = 0

  for (const [key, session] of memoryStore.entries()) {
    if (now - session.lastActivity.getTime() > ttlMs) {
      memoryStore.delete(key)
      cleaned++
    }
  }

  if (cleaned > 0) logger.debug(`Sesiones limpiadas: ${cleaned}`)
}
