import fs from 'fs'
import path from 'path'
import { StorageAdapter, CompanyInfo, PricingItem } from '../../types'
import { logger } from '../../core/logger'

export class LocalJsonAdapter implements StorageAdapter {
  readonly name = 'local_json'
  private dataDir: string

  constructor(dataDir = './data') {
    this.dataDir = dataDir
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
    this.ensureDefaults()
  }

  private ensureDefaults() {
    const companyFile = path.join(this.dataDir, 'company.json')
    const pricingFile = path.join(this.dataDir, 'pricing.json')

    if (!fs.existsSync(companyFile)) {
      const defaults: CompanyInfo = {
        name: 'Mi Empresa',
        description: 'Descripción de la empresa. Edítala desde el panel.',
        services: ['Servicio 1', 'Servicio 2'],
        schedule: 'Lunes a Viernes de 9:00 a 18:00',
        address: '',
        phone: '',
        faqs: [{ question: '¿Dónde estáis?', answer: 'En nuestra dirección principal.' }],
      }
      fs.writeFileSync(companyFile, JSON.stringify(defaults, null, 2), 'utf-8')
    }

    if (!fs.existsSync(pricingFile)) {
      const defaults: PricingItem[] = [
        { name: 'Servicio básico', price: 50, currency: '€', description: '', category: 'General' },
      ]
      fs.writeFileSync(pricingFile, JSON.stringify(defaults, null, 2), 'utf-8')
    }
  }

  async getCompanyInfo(): Promise<CompanyInfo> {
    const file = path.join(this.dataDir, 'company.json')
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as CompanyInfo
  }

  async getPricing(): Promise<PricingItem[]> {
    const file = path.join(this.dataDir, 'pricing.json')
    if (!fs.existsSync(file)) return []
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as PricingItem[]
  }

  async saveCompanyInfo(info: CompanyInfo): Promise<void> {
    const file = path.join(this.dataDir, 'company.json')
    fs.writeFileSync(file, JSON.stringify(info, null, 2), 'utf-8')
    logger.info('company.json actualizado')
  }

  async savePricing(pricing: PricingItem[]): Promise<void> {
    const file = path.join(this.dataDir, 'pricing.json')
    fs.writeFileSync(file, JSON.stringify(pricing, null, 2), 'utf-8')
    logger.info('pricing.json actualizado')
  }

  watchForChanges(callback: () => void): void {
    ['company.json', 'pricing.json'].forEach(f => {
      const full = path.join(this.dataDir, f)
      if (fs.existsSync(full)) {
        fs.watch(full, () => { logger.debug(`${f} modificado`); callback() })
      }
    })
  }
}
