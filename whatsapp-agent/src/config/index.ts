import { z } from 'zod'
import dotenv from 'dotenv'
dotenv.config()

const ConfigSchema = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  ANTHROPIC_API_KEY: z.string(),

  MESSAGING_ADAPTER: z.enum(['twilio_whatsapp', 'telegram', 'meta_whatsapp']).default('twilio_whatsapp'),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_WHATSAPP_NUMBER: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),

  CALENDAR_ADAPTER: z.enum(['google_calendar', 'caldav', 'mock']).default('google_calendar'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REFRESH_TOKEN: z.string().optional(),
  GOOGLE_CALENDAR_ID: z.string().optional(),
  GOOGLE_SPREADSHEET_ID: z.string().optional(),

  STORAGE_ADAPTER: z.enum(['google_sheets', 'notion', 'local_json', 'airtable']).default('google_sheets'),
  NOTION_API_KEY: z.string().optional(),
  NOTION_DATABASE_ID: z.string().optional(),

  EMAIL_ADAPTER: z.enum(['gmail', 'smtp', 'sendgrid', 'resend']).default('smtp'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),

  COMPLAINTS_EMAIL: z.string().email(),
  OWNER_PHONE: z.string(),
  APPOINTMENT_DURATION_MINUTES: z.string().default('60'),
  SESSION_TTL_SECONDS: z.string().default('3600'),

  DATABASE_PATH: z.string().default('./data/agent.db'),
  REDIS_URL: z.string().optional(),

  // ─── Marca del cliente ───────────────────────────────────
  BRAND_NAME:             z.string().default('Mi Empresa'),
  BRAND_LOGO_URL:         z.string().optional(),
  BRAND_FAVICON_URL:      z.string().optional(),
  BRAND_COLOR_PRIMARY:    z.string().default('#6c63ff'),
  BRAND_COLOR_SECONDARY:  z.string().default('#8b85ff'),
  BRAND_COLOR_BG:         z.string().default('#0f1117'),
  BRAND_COLOR_SURFACE:    z.string().default('#1a1d27'),
  BRAND_COLOR_SURFACE2:   z.string().default('#222536'),
  BRAND_COLOR_BORDER:     z.string().default('#2e3147'),
  BRAND_COLOR_TEXT:       z.string().default('#e8eaf6'),
  BRAND_COLOR_MUTED:      z.string().default('#7b7fa8'),
  BRAND_DARK_MODE:        z.enum(['true','false']).default('true'),
})

function loadConfig() {
  const parsed = ConfigSchema.safeParse(process.env)
  if (!parsed.success) {
    console.error('Variables de entorno invalidas:')
    parsed.error.errors.forEach(e => console.error(` - ${e.path.join('.')}: ${e.message}`))
    process.exit(1)
  }
  return parsed.data
}

export const config = loadConfig()
export type Config = z.infer<typeof ConfigSchema>
