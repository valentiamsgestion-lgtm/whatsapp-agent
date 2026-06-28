import {
  IncomingMessage, Session, Intent,
  CalendarAdapter, CompanyInfo, PricingItem, Appointment
} from '../../types'
import { generateResponse } from '../../core/responseGenerator'
import { saveSession } from '../../core/sessionManager'
import { config } from '../../config'
import { logger } from '../../core/logger'

// Utilidad: parsear fecha en lenguaje natural (simplificada)
function parseDate(text: string): Date | null {
  const tomorrow = /mañana/i.test(text)
  const today = /hoy/i.test(text)

  // dd/mm o "el 15" o "el 3 de julio"
  const explicit = text.match(/(\d{1,2})[\s/\-](?:de\s+)?(\w+)?/)

  const base = new Date()
  if (tomorrow) { base.setDate(base.getDate() + 1); return base }
  if (today) return base
  if (explicit) {
    const day = parseInt(explicit[1])
    if (day >= 1 && day <= 31) {
      base.setDate(day)
      return base
    }
  }
  return null
}

function parseTime(text: string): { h: number; m: number } | null {
  const match = text.match(/(\d{1,2})(?::(\d{2}))?\s*(?:h|hrs?)?/i)
  if (!match) return null
  return { h: parseInt(match[1]), m: parseInt(match[2] ?? '0') }
}

export async function handleAppointments(
  incoming: IncomingMessage,
  session: Session,
  intent: Intent,
  calendar: CalendarAdapter,
  company: CompanyInfo,
  pricing: PricingItem[]
): Promise<string> {

  const msg = incoming.body
  const duration = parseInt(config.APPOINTMENT_DURATION_MINUTES)

  // ── CONSULTA: ver mis citas ──
  if (intent === 'appointment_query') {
    try {
      const appt = await calendar.getAppointmentByContact(incoming.from)
      if (!appt) return 'No encuentro ninguna cita registrada con tu número. ¿Quieres reservar una?'
      return `Tienes una cita el ${appt.startTime.toLocaleDateString('es-ES', {
        weekday: 'long', day: 'numeric', month: 'long'
      })} a las ${appt.startTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}. ¿Necesitas cambiarla o cancelarla?`
    } catch (err) {
      logger.error('Error consultando cita', { err })
      return 'No pude consultar tus citas ahora mismo. Inténtalo en un momento.'
    }
  }

  // ── CANCELAR ──
  if (intent === 'appointment_cancel') {
    try {
      const appt = await calendar.getAppointmentByContact(incoming.from)
      if (!appt?.id) return 'No encuentro una cita activa para cancelar. ¿Quieres reservar una nueva?'
      await calendar.cancelAppointment(appt.id)
      return `✅ Tu cita del ${appt.startTime.toLocaleDateString('es-ES')} ha sido cancelada. ¿Quieres reservar otro día?`
    } catch (err) {
      logger.error('Error cancelando cita', { err })
      return 'Hubo un problema al cancelar. Llámanos directamente y lo gestionamos.'
    }
  }

  // ── CREAR / MODIFICAR: flujo conversacional por pasos ──
  if (session.state === 'idle' || intent === 'appointment_create' || intent === 'appointment_modify') {
    session.state = 'collecting_appointment'
    await saveSession(session)

    // Buscar huecos disponibles para los próximos 3 días
    const slots: string[] = []
    for (let d = 1; d <= 3; d++) {
      const date = new Date()
      date.setDate(date.getDate() + d)
      try {
        const available = await calendar.getAvailableSlots(date, duration)
        available.slice(0, 2).forEach(s => {
          slots.push(`📅 ${s.start.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })} a las ${s.start.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`)
        })
      } catch { /* ignorar si falla un día */ }
    }

    if (slots.length === 0) {
      return 'En este momento no veo huecos disponibles en los próximos días. ¿Quieres que te avisemos cuando haya disponibilidad?'
    }

    return `Aquí tienes los próximos huecos disponibles:\n${slots.join('\n')}\n\n¿Cuál te viene bien? También puedes decirme otro día y hora.`
  }

  // Si estamos en medio del flujo, continuar con Claude para extraer fecha/hora
  if (session.state === 'collecting_appointment') {
    const date = parseDate(msg)
    const time = parseTime(msg)

    if (date && time) {
      date.setHours(time.h, time.m, 0, 0)
      const endDate = new Date(date.getTime() + duration * 60 * 1000)

      const appointment: Appointment = {
        title: `Cita — ${company.name}`,
        startTime: date,
        endTime: endDate,
        attendeeName: incoming.from, // mejorar con nombre si se recopila
        attendeeContact: incoming.from,
      }

      try {
        const id = await calendar.createAppointment(appointment)
        session.state = 'idle'
        await saveSession(session)
        return `✅ ¡Cita confirmada!\n📅 ${date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} a las ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}\n\nTe esperamos. Si necesitas cambiarla, escríbenos aquí.`
      } catch (err) {
        logger.error('Error creando cita', { err })
        return 'Hubo un problema al guardar la cita. ¿Puedes intentarlo de nuevo?'
      }
    }

    // No se pudo extraer fecha/hora — seguir con Claude
    return generateResponse(msg, session.context.slice(-4), company, pricing,
      'El usuario está eligiendo fecha para una cita. Ayúdale a concretar día y hora.')
  }

  return generateResponse(msg, session.context.slice(-4), company, pricing)
}
