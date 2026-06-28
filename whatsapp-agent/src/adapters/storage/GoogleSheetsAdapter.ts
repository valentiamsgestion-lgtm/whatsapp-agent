import { google, sheets_v4, drive_v3 } from 'googleapis'
import { StorageAdapter, CompanyInfo, PricingItem } from '../../types'
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

export class GoogleSheetsAdapter implements StorageAdapter {
  readonly name = 'google_sheets'
  private sheets: sheets_v4.Sheets
  private spreadsheetId = config.GOOGLE_SPREADSHEET_ID!

  constructor() {
    if (!config.GOOGLE_SPREADSHEET_ID) throw new Error('Falta GOOGLE_SPREADSHEET_ID')
    const auth = getAuth()
    this.sheets = google.sheets({ version: 'v4', auth })
  }

  /**
   * El spreadsheet debe tener dos hojas:
   * 1. "Info" — columnas: campo | valor
   * 2. "Precios" — columnas: nombre | precio | moneda | descripcion | categoria
   */
  async getCompanyInfo(): Promise<CompanyInfo> {
    const { data } = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: 'Info!A2:B50',
    })

    const rows = data.values ?? []
    const get = (key: string) =>
      rows.find(r => r[0]?.toLowerCase() === key.toLowerCase())?.[1] ?? ''

    const faqs: CompanyInfo['faqs'] = []
    rows.forEach(r => {
      if (r[0]?.startsWith('faq_pregunta_')) {
        const n = r[0].split('_')[2]
        const answer = get(`faq_respuesta_${n}`)
        if (r[1] && answer) faqs.push({ question: r[1], answer })
      }
    })

    logger.debug('Info empresa cargada desde Google Sheets')
    return {
      name:        get('nombre'),
      description: get('descripcion'),
      services:    get('servicios').split(',').map((s: string) => s.trim()).filter(Boolean),
      schedule:    get('horario'),
      address:     get('direccion') || undefined,
      phone:       get('telefono') || undefined,
      faqs,
    }
  }

  async getPricing(): Promise<PricingItem[]> {
    const { data } = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: 'Precios!A2:E100',
    })

    const rows = data.values ?? []
    return rows
      .filter(r => r[0] && r[1])
      .map(r => ({
        name:        r[0],
        price:       parseFloat(r[1].replace(',', '.')),
        currency:    r[2] ?? '€',
        description: r[3] ?? undefined,
        category:    r[4] ?? undefined,
      }))
  }
}
