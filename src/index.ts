import { createServer } from './admin/server'
import { config } from './config'
import { logger } from './core/logger'
import fs from 'fs'

// Crear directorios necesarios
;['logs', 'data'].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d) })

async function main() {
  logger.info('Arrancando agente conversacional...')

  const app = await createServer()

  app.listen(parseInt(config.PORT), () => {
    logger.info(`✅ Servidor activo en puerto ${config.PORT}`)
    logger.info(`   Webhook: POST /webhook/${config.MESSAGING_ADAPTER}`)
    logger.info(`   Health:  GET  /health`)
    logger.info(`   Admin:   POST /admin/refresh-cache`)
  })
}

main().catch(err => {
  console.error('Error fatal:', err)
  process.exit(1)
})
