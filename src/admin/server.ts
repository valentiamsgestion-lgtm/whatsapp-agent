import express from 'express'
import path from 'path'
import { buildAdapters } from '../adapters'
import { processMessage, invalidateCompanyCache, AgentAdapters } from '../core/orchestrator'
import { cleanStaleSessions } from '../core/sessionManager'
import { createAdminRouter, recordConversation } from './routes/api'
import { generatePanelHtml, extractBrand } from './panelGenerator'
import { config } from '../config'
import { logger } from '../core/logger'

export async function createServer() {
  const app = express()
  app.use(express.json())
  app.use(express.urlencoded({ extended: false }))

  const adapters: AgentAdapters = await buildAdapters()

  if ('watchForChanges' in adapters.storage) {
    (adapters.storage as any).watchForChanges(() => invalidateCompanyCache())
  }

  // ── Panel admin — HTML generado con marca del cliente ──
  const brand = extractBrand(config)
  const panelHtml = generatePanelHtml(brand)

  app.get('/admin', (_req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.send(panelHtml)
  })

  // Servir assets estáticos (logo del cliente si se sube localmente)
  const publicDir = path.join(__dirname, 'public')
  app.use('/admin/static', express.static(publicDir))

  // ── API admin ──
  app.use('/admin/api', createAdminRouter(adapters.storage))

  // ── Webhook mensajería ──
  app.post('/webhook/:channel', async (req, res) => {
    try {
      if (!adapters.messaging.validateWebhook(req)) {
        logger.warn('Webhook con firma inválida')
        return res.status(403).send('Forbidden')
      }
      const incoming = adapters.messaging.parseIncoming(req.body)
      res.status(200).send('OK')

      processMessage(incoming, adapters)
        .then(() => recordConversation(incoming.from, incoming.channel, incoming.body, false))
        .catch(err => logger.error('Error procesando mensaje', { err }))
    } catch (err) {
      logger.error('Error en webhook', { err })
      res.status(500).send('Error')
    }
  })

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      brand: brand.name,
      adapters: {
        messaging: adapters.messaging.name,
        calendar:  adapters.calendar.name,
        storage:   adapters.storage.name,
        email:     adapters.email.name,
      }
    })
  })

  setInterval(cleanStaleSessions, 60 * 60 * 1000)

  return app
}
