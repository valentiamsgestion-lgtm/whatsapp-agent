import Anthropic from '@anthropic-ai/sdk'
import { ConversationTurn, CompanyInfo, PricingItem } from '../types'
import { config } from '../config'
import { logger } from './logger'

const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY })

function buildSystemPrompt(companyInfo: CompanyInfo, pricing: PricingItem[]): string {
  const priceList = pricing
    .map(p => `- ${p.name}: ${p.price}${p.currency}${p.description ? ' — ' + p.description : ''}`)
    .join('\n')

  return `Eres el asistente virtual de ${companyInfo.name}.

SOBRE LA EMPRESA:
${companyInfo.description}

SERVICIOS:
${companyInfo.services.join('\n')}

HORARIO:
${companyInfo.schedule}

${companyInfo.address ? `DIRECCIÓN: ${companyInfo.address}` : ''}
${companyInfo.phone ? `TELÉFONO: ${companyInfo.phone}` : ''}

PRECIOS ACTUALES:
${priceList}

PREGUNTAS FRECUENTES:
${companyInfo.faqs.map(f => `P: ${f.question}\nR: ${f.answer}`).join('\n\n')}

INSTRUCCIONES:
- Responde siempre en español, de forma amable y concisa
- Máximo 3-4 frases por respuesta (es WhatsApp, no un email)
- Si no sabes algo, di que lo consultarás y derivarás al equipo
- No inventes información que no esté en este contexto
- Para citas, reclamaciones o hablar con una persona, el sistema te avisará de qué hacer`
}

export async function generateResponse(
  userMessage: string,
  context: ConversationTurn[],
  companyInfo: CompanyInfo,
  pricing: PricingItem[],
  systemExtra?: string
): Promise<string> {

  const system = buildSystemPrompt(companyInfo, pricing)
    + (systemExtra ? '\n\n' + systemExtra : '')

  const messages: Anthropic.MessageParam[] = [
    ...context.map(turn => ({
      role: turn.role as 'user' | 'assistant',
      content: turn.content,
    })),
    { role: 'user', content: userMessage },
  ]

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      system,
      messages,
    })

    return response.content[0].type === 'text'
      ? response.content[0].text
      : 'Lo siento, no pude procesar tu mensaje. Por favor, inténtalo de nuevo.'

  } catch (err) {
    logger.error('Error generando respuesta', { err })
    return 'Estamos teniendo problemas técnicos. Un momento, por favor.'
  }
}
