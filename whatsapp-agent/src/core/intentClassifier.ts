import Anthropic from '@anthropic-ai/sdk'
import { Intent, ConversationTurn } from '../types'
import { config } from '../config'
import { logger } from './logger'

const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY })

const INTENT_SYSTEM = `Eres un clasificador de intents para un chatbot de atención al cliente.
Analiza el mensaje del usuario y devuelve SOLO el intent como JSON.

Intents disponibles:
- info: pregunta sobre la empresa, horarios, dirección, descripción
- pricing: pregunta sobre precios, tarifas, costes
- appointment_create: quiere pedir/reservar una cita
- appointment_modify: quiere cambiar o modificar una cita existente
- appointment_cancel: quiere cancelar una cita
- appointment_query: pregunta sobre sus citas existentes
- complaint: queja, reclamación, problema con un servicio o producto
- human_request: pide hablar con una persona o agente humano
- human_toggle: comando de operador para activar/desactivar modo humano (#humano, #bot, /humano, /bot)
- unknown: no encaja en ninguna categoría anterior

Responde SOLO con JSON: {"intent": "nombre_del_intent", "confidence": 0.0-1.0, "reasoning": "breve explicación"}`

export interface ClassifiedIntent {
  intent: Intent
  confidence: number
  reasoning: string
}

export async function classifyIntent(
  message: string,
  recentContext: ConversationTurn[]
): Promise<ClassifiedIntent> {

  // Comandos del propietario: detección rápida sin LLM
  const lower = message.toLowerCase().trim()
  if (['#humano', '/humano', '#human', 'human_on'].includes(lower)) {
    return { intent: 'human_toggle', confidence: 1, reasoning: 'comando directo' }
  }
  if (['#bot', '/bot', 'bot_on', '#chatbot'].includes(lower)) {
    return { intent: 'human_toggle', confidence: 1, reasoning: 'comando directo' }
  }

  const contextStr = recentContext
    .slice(-4)
    .map(t => `${t.role}: ${t.content}`)
    .join('\n')

  const prompt = contextStr
    ? `Contexto reciente:\n${contextStr}\n\nMensaje actual: ${message}`
    : `Mensaje: ${message}`

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      system: INTENT_SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim())

    return {
      intent: parsed.intent as Intent,
      confidence: parsed.confidence ?? 0.8,
      reasoning: parsed.reasoning ?? '',
    }
  } catch (err) {
    logger.error('Error clasificando intent', { err, message })
    return { intent: 'unknown', confidence: 0, reasoning: 'error de clasificación' }
  }
}
