import { CalendarAdapter, Appointment, TimeSlot } from '../../types'

const store = new Map<string, Appointment>()
let idCounter = 1

export class MockCalendarAdapter implements CalendarAdapter {
  readonly name = 'mock'

  async getAvailableSlots(date: Date, durationMinutes: number): Promise<TimeSlot[]> {
    const slots: TimeSlot[] = []
    const hours = [9, 10, 11, 12, 16, 17, 18]
    for (const h of hours) {
      const start = new Date(date)
      start.setHours(h, 0, 0, 0)
      const end = new Date(start.getTime() + durationMinutes * 60 * 1000)
      slots.push({ start, end, available: true })
    }
    return slots
  }

  async createAppointment(appointment: Appointment): Promise<string> {
    const id = String(idCounter++)
    store.set(id, { ...appointment, id })
    return id
  }

  async updateAppointment(id: string, changes: Partial<Appointment>): Promise<void> {
    const existing = store.get(id)
    if (existing) store.set(id, { ...existing, ...changes })
  }

  async cancelAppointment(id: string): Promise<void> {
    store.delete(id)
  }

  async getAppointmentByContact(contact: string): Promise<Appointment | null> {
    for (const appt of store.values()) {
      if (appt.attendeeContact === contact) return appt
    }
    return null
  }
}
