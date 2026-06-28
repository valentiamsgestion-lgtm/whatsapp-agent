import nodemailer from 'nodemailer'
import { EmailAdapter, Complaint, Appointment } from '../../types'
import { config } from '../../config'
import { logger } from '../../core/logger'

export class SmtpEmailAdapter implements EmailAdapter {
  readonly name = 'smtp'
  private transporter: nodemailer.Transporter

  constructor() {
    this.transporter = nodemailer.createTransport({
      host:   config.SMTP_HOST,
      port:   parseInt(config.SMTP_PORT ?? '587'),
      secure: parseInt(config.SMTP_PORT ?? '587') === 465,
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASS,
      },
    })
  }

  async sendComplaint(complaint: Complaint, toEmail: string): Promise<void> {
    const html = `
      <h2>Nueva reclamación recibida</h2>
      <table style="border-collapse:collapse;width:100%">
        <tr><td style="padding:8px;border:1px solid #ddd"><b>Cliente</b></td><td style="padding:8px;border:1px solid #ddd">${complaint.fromName}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd"><b>Contacto</b></td><td style="padding:8px;border:1px solid #ddd">${complaint.fromContact}</td></tr>
        ${complaint.orderId ? `<tr><td style="padding:8px;border:1px solid #ddd"><b>Referencia</b></td><td style="padding:8px;border:1px solid #ddd">${complaint.orderId}</td></tr>` : ''}
        <tr><td style="padding:8px;border:1px solid #ddd"><b>Descripción</b></td><td style="padding:8px;border:1px solid #ddd">${complaint.description}</td></tr>
        <tr><td style="padding:8px;border:1px solid #ddd"><b>Fecha</b></td><td style="padding:8px;border:1px solid #ddd">${complaint.createdAt.toLocaleString('es-ES')}</td></tr>
      </table>
    `

    await this.transporter.sendMail({
      from:    config.SMTP_FROM ?? config.SMTP_USER,
      to:      toEmail,
      subject: `[Reclamación] ${complaint.fromName} — ${complaint.createdAt.toLocaleDateString('es-ES')}`,
      html,
    })
    logger.info('Email de reclamación enviado', { to: toEmail })
  }

  async sendAppointmentConfirmation(appointment: Appointment, toEmail: string): Promise<void> {
    const html = `
      <h2>Nueva cita confirmada</h2>
      <p><b>Cliente:</b> ${appointment.attendeeName}</p>
      <p><b>Contacto:</b> ${appointment.attendeeContact}</p>
      <p><b>Fecha:</b> ${appointment.startTime.toLocaleString('es-ES')}</p>
      ${appointment.notes ? `<p><b>Notas:</b> ${appointment.notes}</p>` : ''}
    `

    await this.transporter.sendMail({
      from:    config.SMTP_FROM ?? config.SMTP_USER,
      to:      toEmail,
      subject: `[Cita] ${appointment.attendeeName} — ${appointment.startTime.toLocaleDateString('es-ES')}`,
      html,
    })
  }
}
