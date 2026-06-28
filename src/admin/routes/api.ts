——————————————import { Router, Request, Response } from 'express'
import { getSession, saveSession } from '../../core/sessionManager'
import { invalidateCompanyCache } from '../../core/orchestrator'
import { logger } from '../../core/logger'

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
          preview: message.substring(0, 80),
    })
}

export function createAdminRouter(storage: any, adapters: any, processMessage: any) {
    const router = Router()

  // — GET /admin/api/conversations —
  router.get('/conversations', (_req: Request, res: Response) => {
        const list = Array.from(conversationStore.values())
        res.json(list)
  })

  // — POST /admin/api/conversations/:userId/human-mode —
  router.post('/conversations/:userId/human-mode', async (req, res) => {
        const { userId } = req.params
        const { channel, enabled } = req.body
        const key = `${channel}:${userId}`
        const conv = conversationStore.get(key)
        if (conv) {
                conv.humanMode = enabled
                conversationStore.set(key, conv)
        }
        const session = await getSession(userId, channel)
        session.humanMode = enabled
                await saveSession(session)
        res.json({ ok: true })
  })

  // — GET /admin/api/company —
  router.get('/company', async (_req: Request, res: Response) => {
        try {
                const data = await storage.getCompanyData?.() ?? {}
                        res.json(data)
        } catch {
                res.json({})
        }
  })

  // — POST /admin/api/company —
  router.post('/company', async (req, res) => {
        try {
                await storage.saveCompanyData?.(req.body)
                invalidateCompanyCache()
                res.json({ ok: true })
        } catch (err) {
                logger.error('Error guardando company data', { err })
                res.status(500).json({ error: 'Error guardando datos' })
        }
  })

  // — GET /admin/api/stats —
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

  // — POST /admin/api/cache/refresh —
  router.post('/cache/refresh', (_req: Request, res: Response) => {
        invalidateCompanyCache()
        res.json({ ok: true })
  })

  // — POST /admin/api/simulate — Simula un mensaje entrante sin validar firma Twilio
  router.post('/simulate', async (req: Request, res: Response) => {
        try {
                const { message, userId } = req.body
                if (!message) {
                          return res.status(400).json({ error: 'Falta el campo message' })
                }
                const phone = userId || '+34000000000'
                const incoming = {
                          id: `sim_${Date.now()}`,
                          from: phone,
                          body: message,
                          timestamp: new Date(),
                          channel: 'whatsapp',
                          raw: req.body,
                }
                const replies: string[] = []
                        const fakeAdapter = {
                                  ...adapters,
                                  messaging: {
                                              ...adapters.messaging,
                                              send: async (msg: any) => { replies.push(msg.body) },
                                  },
                        }
                recordConversation(phone, 'whatsapp', message, false)
                await processMessage(incoming, fakeAdapter)
                res.json({ ok: true, replies })
        } catch (err: any) {
                logger.error('Error en simulate', { err })
                res.status(500).json({ error: err.message || 'Error interno' })
        }
  })

  return router
}
