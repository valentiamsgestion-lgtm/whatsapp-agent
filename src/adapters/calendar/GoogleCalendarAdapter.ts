import { google, calendar_v3 } from 'googleapis'
import { CalendarAdapter, Appointment, TimeSlot } from '../../types'
import { config } from '../../config'
import { logger } from '../../core/logger'

function getAuth() {
  const auth = new google.auth.OAuth2(
    config.GOOGLE_CLIENT_ID,
    config.GOOGLE_CLIENT_SECRET
  )
  auth.setCredentials({ refresh_token: config.GOOGLE_REFRESH_TOKEN })
  return auth
}

export class GoogleCalendarAdapter implements CalendarAdapter {
  readonly name = 'google_calendar'
  private calId = config.GOOGLE_CALENDAR_ID!
  private cal: calendar_v3.Calendar

  constructor() {
    if (!config.GOOGLE_CALENDAR_ID) throw new Error('Falta GOOGLE_CALENDAR_ID')
    this.cal = google.calendar({ version: 'v3', auth: getAuth() })
  }

  async getAvailableSlots(date: Date, durationMinutes: number): Promise<TimeSlot[]> {
    const dayStart = new Date(date)
    dayStart.setHours(9, 0, 0, 0)
    const dayEnd = new Date(date)
    dayEnd.setHours(19, 0, 0, 0)

    const { data } = await this.cal.freebusy.query({
      requestBody: {
        timeMin: dayStart.toISOString(),
        timeMax: dayEnd.toISOString(),
        items: [{ id: this.calId }],
      },
    })

    const busy = data.calendars?.[this.calId]?.busy ?? []
    const slots: TimeSlot[] = []

    let cursor = new Date(dayStart)
    while (cursor < dayEnd) {
      const end = new Date(cursor.getTime() + durationMinutes * 60 * 1000)
      if (end > dayEnd) break

      const overlap = busy.some(b => {
        const bs = new Date(b.start!)
        const be = new Date(b.end!)
        return cursor < be && end > bs
      })

      if (!overlap) slots.push({ start: new Date(cursor), end, available: true })
      cursor = new Date(cursor.getTime() + durationMinutes * 60 * 1000)
    }

    return slots
  }

  async createAppointment(appointment: Appointment): Promise<string> {
    const { data } = await this.cal.events.insert({
      calendarId: this.calId,
      requestBody: {
        summary: appointment.title,
        description: `Cliente: ${appointment.attendeeName}\nContacto: ${appointment.attendeeContact}\n${appointment.notes ?? ''}`,
        start: { dateTime: appointment.startTime.toISOString() },
        end:   { dateTime: appointment.endTime.toISOString() },
        extendedProperties: {
          private: { attendeeContact: appointment.attendeeContact }
        },
      },
    })
    logger.info('Cita creada en Google Calendar', { id: data.id })
    return data.id!
  }

  async updateAppointment(id: string, changes: Partial<Appointment>): Promise<void> {
    const patch: calendar_v3.Schema$Event = {}
    if (changes.startTime) patch.start = { dateTime: changes.startTime.toISOString() }
    if (changes.endTime)   patch.end   = { dateTime: changes.endTime.toISOString() }
    if (changes.notes)     patch.description = changes.notes
    await this.cal.events.patch({ calendarId: this.calId, eventId: id, requestBody: patch })
  }

  async cancelAppointment(id: string): Promise<void> {
    await this.cal.events.delete({ calendarId: this.calId, eventId: id })
    logger.info('Cita cancelada', { id })
  }

  async getAppointmentByContact(contact: string): Promise<Appointment | null> {
    const { data } = await this.cal.events.list({
      calendarId: this.calId,
      timeMin: new Date().toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    })

    const event = data.items?.find(e =>
      e.extendedProperties?.private?.attendeeContact === contact
    )
    if (!event) return null

    return {
      id: event.id!,
      title: event.summary ?? '',
      startTime: new Date(event.start!.dateTime!),
      endTime:   new Date(event.end!.dateTime!),
      attendeeName: contact,
      attendeeContact: contact,
      notes: event.description ?? undefined,
    }
  }
}
