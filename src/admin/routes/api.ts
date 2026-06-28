import { Router, Request, Response } from 'express'
import { getSession, saveSession } from '../core/sessionManager'
import { invalidateCompanyCache } from '../core/orchestrator'
import { logger } from '../core/logger'

// Store en memoria de conversaciones activas (en prod usar DB)
export const conversationStore = new Map<string, {
  userId: string
  channel: string
  lastMessage: string
  lastActivity: Date
  humanMode: boolean
  messageCount: number
  preview: string
}>()

export function recordConversation(userId: string, channel: string, message: string, humanMode: boolean) {
  const key = `${channel}:${userId}`
  const existing = conversationStore.get(key)
  conversationStore.set(key, {
    userId,
    channel,
    lastMessage: message,
    lastActivity: new Date(),
    humanMode,
    messageCount: (existing?.messageCount ?? 0) + 1,
    preview: message.slice(0, 80),
  })
}

export function createAdminRouter(storage: any): Router {
  const router = Router()

  // ── GET /admin/api/conversations ──
  router.get('/conversations', (_req: Request, res: Response) => {
    const list = Array.from(conversationStore.values())
      .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
    res.json(list)
  })

  // ── POST /admin/api/conversations/:userId/human-mode ──
  router.post('/conversations/:userId/human-mode', async (req: Request, res: Response) => {
    const { userId } = req.params
    const { channel = 'whatsapp', enabled } = req.body

    try {
      const session = await getSession(userId, channel)
      session.humanMode = Boolean(enabled)
      await saveSession(session)

      const key = `${channel}:${userId}`
      const conv = conversationStore.get(key)
      if (conv) {
        conv.humanMode = Boolean(enabled)
        conversationStore.set(key, conv)
      }

      logger.info('Modo humano cambiado desde panel', { userId, enabled })
      res.json({ ok: true, humanMode: session.humanMode })
    } catch (err) {
      res.status(500).json({ error: 'No se pudo actualizar la sesión' })
    }
  })

  // ── GET /admin/api/company ──
  router.get('/company', async (_req: Request, res: Response) => {
    try {
      const [company, pricing] = await Promise.all([
        storage.getCompanyInfo(),
        storage.getPricing(),
      ])
      res.json({ company, pricing })
    } catch (err) {
      res.status(500).json({ error: 'No se pudo cargar la info de empresa' })
    }
  })

  // ── POST /admin/api/company ──
  // Guarda en local_json (si el storage lo soporta)
  router.post('/company', async (req: Request, res: Response) => {
    try {
      const { company, pricing } = req.body
      if (typeof storage.saveCompanyInfo === 'function') {
        await storage.saveCompanyInfo(company)
      }
      if (typeof storage.savePricing === 'function') {
        await storage.savePricing(pricing)
      }
      invalidateCompanyCache()
      logger.info('Info de empresa actualizada desde panel')
      res.json({ ok: true })
    } catch (err) {
      logger.error('Error guardando empresa', { err })
      res.status(500).json({ error: 'No se pudo guardar' })
    }
  })

  // ── GET /admin/api/stats ──
  router.get('/stats', (_req: Request, res: Response) => {
    const convs = Array.from(conversationStore.values())
    const humanActive = convs.filter(c => c.humanMode).length
    const last24h = convs.filter(c =>
      Date.now() - c.lastActivity.getTime() < 24 * 60 * 60 * 1000
    ).length

    res.json({
      totalConversations: convs.length,
      humanModeActive: humanActive,
      activeLast24h: last24h,
    })
  })

  // ── POST /admin/api/cache/refresh ──
  router.post('/cache/refresh', (_req: Request, res: Response) => {
    invalidateCompanyCache()
    res.json({ ok: true })
  })

  return router
}
