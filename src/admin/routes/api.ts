import { Router, Request, Response } from 'express'
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

export function recordConversation(userId: string, channel: string, message: string, humanMode: boolean = false) {
            const key = `${channel}:${userId}`
            const existing = conversationStore.get(key)
            conversationStore.set(key, {
                            userId,
                            channel,
                            lastMessage: message,
                            lastActivity: new Date(),
                            humanMode,
                            messageCount: (existing?.messageCount ?? 0) + 1,
                            preview: message.substring(0, 100)
            })
}

export function createAdminRouter(storage: any, adapters?: any, processMessage?: any) {
            const router = Router()

    // GET /admin/api/conversations
    router.get('/conversations', async (req: Request, res: Response) => {
                    try {
                                        const conversations = Array.from(conversationStore.values())
                                            .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
                                        res.json({ success: true, conversations })
                    } catch (error) {
                                        logger.error('Error getting conversations:', error)
                                        res.status(500).json({ success: false, error: 'Internal server error' })
                    }
    })

    // POST /admin/api/simulate - Test endpoint (bypasses Twilio signature validation)
    router.post('/simulate', async (req: Request, res: Response) => {
                    try {
                                        const { message, userId, channel } = req.body
                                        if (!message || !userId) {
                                                                return res.status(400).json({ success: false, error: 'message and userId are required' })
                                        }
                                        const targetChannel = channel || 'whatsapp'

                        if (!processMessage || !adapters) {
                                                return res.status(500).json({ success: false, error: 'processMessage or adapters not available' })
                        }

                        // Capture bot responses via a mock messaging adapter
                        const capturedResponses: string[] = []
                                            const mockAdapters = {
                                                                    ...adapters,
                                                                    messaging: {
                                                                                                ...adapters.messaging,
                                                                                                send: async (msg: any) => {
                                                                                                                                capturedResponses.push(msg.body)
                                                                                                        }
                                                                    }
                                            }

                        // Build IncomingMessage
                        const incoming = {
                                                id: `simulate-${Date.now()}`,
                                                from: userId,
                                                body: message,
                                                timestamp: new Date(),
                                                channel: targetChannel,
                                                raw: null
                        }

                        // Process the message
                        await processMessage(incoming, mockAdapters)

                        // Record conversation
                        recordConversation(userId, targetChannel, message)

                        res.json({
                                                success: true,
                                                responses: capturedResponses,
                                                response: capturedResponses.join('\n')
                        })
                    } catch (error) {
                                        logger.error('Error in simulate endpoint:', error)
                                        res.status(500).json({ success: false, error: String(error) })
                    }
    })

    // GET /admin/api/company
    router.get('/company', async (req: Request, res: Response) => {
                    try {
                                        const company = await storage.getCompanyInfo()
                                        res.json({ success: true, company })
                    } catch (error) {
                                        logger.error('Error getting company:', error)
                                        res.status(500).json({ success: false, error: 'Internal server error' })
                    }
    })

    // PUT /admin/api/company
    router.put('/company', async (req: Request, res: Response) => {
                    try {
                                        const data = req.body
                                        await storage.saveCompanyInfo(data)
                                        invalidateCompanyCache()
                                        res.json({ success: true })
                    } catch (error) {
                                        logger.error('Error saving company:', error)
                                        res.status(500).json({ success: false, error: 'Internal server error' })
                    }
    })

    // GET /admin/api/pricing
    router.get('/pricing', async (req: Request, res: Response) => {
                    try {
                                        const pricing = await storage.getPricingItems()
                                        res.json({ success: true, pricing })
                    } catch (error) {
                                        logger.error('Error getting pricing:', error)
                                        res.status(500).json({ success: false, error: 'Internal server error' })
                    }
    })

    // POST /admin/api/pricing
    router.post('/pricing', async (req: Request, res: Response) => {
                    try {
                                        const item = req.body
                                        const id = await storage.savePricingItem(item)
                                        res.json({ success: true, id })
                    } catch (error) {
                                        logger.error('Error saving pricing:', error)
                                        res.status(500).json({ success: false, error: 'Internal server error' })
                    }
    })

    // DELETE /admin/api/pricing/:id
    router.delete('/pricing/:id', async (req: Request, res: Response) => {
                    try {
                                        await storage.deletePricingItem(req.params.id)
                                        res.json({ success: true })
                    } catch (error) {
                                        logger.error('Error deleting pricing:', error)
                                        res.status(500).json({ success: false, error: 'Internal server error' })
                    }
    })

    // GET /admin/api/faqs
    router.get('/faqs', async (req: Request, res: Response) => {
                    try {
                                        const faqs = await storage.getFAQs()
                                        res.json({ success: true, faqs })
                    } catch (error) {
                                        logger.error('Error getting faqs:', error)
                                        res.status(500).json({ success: false, error: 'Internal server error' })
                    }
    })

    // POST /admin/api/faqs
    router.post('/faqs', async (req: Request, res: Response) => {
                    try {
                                        const faq = req.body
                                        const id = await storage.saveFAQ(faq)
                                        res.json({ success: true, id })
                    } catch (error) {
                                        logger.error('Error saving faq:', error)
                                        res.status(500).json({ success: false, error: 'Internal server error' })
                    }
    })

    // DELETE /admin/api/faqs/:id
    router.delete('/faqs/:id', async (req: Request, res: Response) => {
                    try {
                                        await storage.deleteFAQ(req.params.id)
                                        res.json({ success: true })
                    } catch (error) {
                                        logger.error('Error deleting faq:', error)
                                        res.status(500).json({ success: false, error: 'Internal server error' })
                    }
    })

    // GET /admin/api/brand
    router.get('/brand', async (req: Request, res: Response) => {
                    try {
                                        const brand = await storage.getBrandSettings()
                                        res.json({ success: true, brand })
                    } catch (error) {
                                        logger.error('Error getting brand:', error)
                                        res.status(500).json({ success: false, error: 'Internal server error' })
                    }
    })

    // PUT /admin/api/brand
    router.put('/brand', async (req: Request, res: Response) => {
                    try {
                                        const data = req.body
                                        await storage.saveBrandSettings(data)
                                        res.json({ success: true })
                    } catch (error) {
                                        logger.error('Error saving brand:', error)
                                        res.status(500).json({ success: false, error: 'Internal server error' })
                    }
    })

    return router
}
