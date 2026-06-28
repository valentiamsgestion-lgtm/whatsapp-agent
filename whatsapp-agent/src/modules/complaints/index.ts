import { IncomingMessage, Session, EmailAdapter, Complaint } from '../../types'
import { saveSession } from '../../core/sessionManager'
import { config } from '../../config'
import { logger } from '../../core/logger'

// Estado de reclamación en progreso guardado en sesión context
function getComplaintDraft(session: Session): Partial<Complaint> {
  return (session as any).__complaintDraft ?? {}
}
function setComplaintDraft(session: Session, draft: Partial<Complaint>) {
  ;(session as any).__complaintDraft = draft
}
function clearComplaintDraft(session: Session) {
  delete (session as any).__complaintDraft
}

export async function handleComplaints(
  incoming: IncomingMessage,
  session: Session,
  email: EmailAdapter
): Promise<string> {

  const msg = incoming.body
  const draft = getComplaintDraft(session)

  // Paso 1: abrir reclamación
  if (session.state !== 'collecting_complaint') {
    session.state = 'collecting_complaint'
    setComplaintDraft(session, { fromContact: incoming.from, createdAt: new Date() })
    await saveSession(session)
    return `Lamentamos los inconvenientes. Para tramitar tu reclamación necesito algunos datos.\n\n¿Puedes describirme brevemente qué ha ocurrido?`
  }

  // Paso 2: recoger descripción
  if (!draft.description) {
    draft.description = msg
    setComplaintDraft(session, draft)
    await saveSession(session)
    return `Anotado. ¿Tienes un número de pedido o referencia relacionado con la incidencia? (Si no, escribe "no tengo")`
  }

  // Paso 3: recoger referencia (opcional)
  if (draft.orderId === undefined) {
    const noRef = /no\s+tengo|sin\s+referencia|no\s+sé|ns/i.test(msg)
    draft.orderId = noRef ? undefined : msg.trim()
    draft.fromName = incoming.from
    setComplaintDraft(session, draft)
    await saveSession(session)
    return `Perfecto. ¿Nos puedes dejar tu nombre completo para identificar mejor la reclamación?`
  }

  // Paso 4: recoger nombre
  if (!draft.fromName || draft.fromName === incoming.from) {
    draft.fromName = msg.trim()
    setComplaintDraft(session, draft)
    await saveSession(session)

    // Confirmar y enviar
    const complaint: Complaint = {
      fromName: draft.fromName,
      fromContact: draft.fromContact ?? incoming.from,
      description: draft.description ?? '',
      orderId: draft.orderId,
      createdAt: draft.createdAt ?? new Date(),
    }

    try {
      await email.sendComplaint(complaint, config.COMPLAINTS_EMAIL)
      clearComplaintDraft(session)
      session.state = 'idle'
      await saveSession(session)

      logger.info('Reclamación enviada', { from: incoming.from })
      return `✅ Reclamación registrada, ${complaint.fromName}.\n\nNuestro equipo la revisará y te contactará en un plazo máximo de 48h. Lamentamos las molestias.`
    } catch (err) {
      logger.error('Error enviando reclamación', { err })
      return 'Hubo un problema al enviar tu reclamación. Por favor, llámanos directamente y lo gestionamos.'
    }
  }

  return '¿Puedes repetirlo? No pude procesar tu respuesta.'
}
