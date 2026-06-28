// ─────────────────────────────────────────────
// TIPOS CENTRALES — no dependen de ningún proveedor
// ─────────────────────────────────────────────

export type Intent =
  | 'info'
  | 'pricing'
  | 'appointment_create'
  | 'appointment_modify'
  | 'appointment_cancel'
  | 'appointment_query'
  | 'complaint'
  | 'human_request'
  | 'human_toggle'   // solo propietario
  | 'unknown'

export interface IncomingMessage {
  id: string
  from: string          // identificador del remitente (phone, userId…)
  body: string
  timestamp: Date
  channel: string       // 'whatsapp' | 'telegram' | ...
  raw?: unknown         // payload original del proveedor
}

export interface OutgoingMessage {
  to: string
  body: string
  channel: string
}

export interface Session {
  userId: string
  channel: string
  humanMode: boolean
  context: ConversationTurn[]
  state: SessionState
  lastActivity: Date
}

export interface ConversationTurn {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  intent?: Intent
}

export type SessionState =
  | 'idle'
  | 'collecting_appointment'
  | 'collecting_complaint'
  | 'awaiting_confirmation'

export interface Appointment {
  id?: string
  title: string
  startTime: Date
  endTime: Date
  attendeeName: string
  attendeeContact: string
  notes?: string
}

export interface TimeSlot {
  start: Date
  end: Date
  available: boolean
}

export interface Complaint {
  id?: string
  fromName: string
  fromContact: string
  description: string
  orderId?: string
  createdAt: Date
}

export interface CompanyInfo {
  name: string
  description: string
  services: string[]
  schedule: string
  address?: string
  phone?: string
  faqs: Array<{ question: string; answer: string }>
}

export interface PricingItem {
  name: string
  price: number
  currency: string
  description?: string
  category?: string
}

// ─────────────────────────────────────────────
// INTERFACES DE ADAPTADORES
// Implementar para añadir cualquier proveedor
// ─────────────────────────────────────────────

/** Adaptador de mensajería: WhatsApp, Telegram, SMS… */
export interface MessagingAdapter {
  readonly name: string
  send(message: OutgoingMessage): Promise<void>
  parseIncoming(rawBody: unknown): IncomingMessage
  validateWebhook(req: unknown): boolean
}

/** Adaptador de calendario: Google Calendar, Calendly, Cal.com… */
export interface CalendarAdapter {
  readonly name: string
  getAvailableSlots(date: Date, durationMinutes: number): Promise<TimeSlot[]>
  createAppointment(appointment: Appointment): Promise<string>  // returns id
  updateAppointment(id: string, changes: Partial<Appointment>): Promise<void>
  cancelAppointment(id: string): Promise<void>
  getAppointmentByContact(contact: string): Promise<Appointment | null>
}

/** Adaptador de almacenamiento: Google Drive/Sheets, Notion, Airtable, S3… */
export interface StorageAdapter {
  readonly name: string
  getCompanyInfo(): Promise<CompanyInfo>
  getPricing(): Promise<PricingItem[]>
  /** Opcional: watch para invalidar caché cuando cambia el fichero */
  watchForChanges?(callback: () => void): void
}

/** Adaptador de email: Gmail, SMTP, SendGrid, Resend… */
export interface EmailAdapter {
  readonly name: string
  sendComplaint(complaint: Complaint, toEmail: string): Promise<void>
  sendAppointmentConfirmation(appointment: Appointment, toEmail: string): Promise<void>
}
