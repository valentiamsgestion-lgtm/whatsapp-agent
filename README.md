# Agente conversacional para PYMEs

Agente de WhatsApp/Telegram con arquitectura de adaptadores intercambiables.
Cambia de proveedor editando una variable de entorno — sin tocar código.

## Funcionalidades

- Información de empresa y precios (desde Google Sheets, Notion o JSON local)
- Gestión de citas con Google Calendar (crear, modificar, cancelar)
- Tramitación de reclamaciones → email automático
- Modo humano: el propietario pausa/activa el bot con `#humano` / `#bot`
- Panel de admin con health check y refresco de caché

## Setup rápido

```bash
cp .env.example .env
# Editar .env con tus credenciales

npm install
npm run dev
```

## Adaptadores disponibles

| Canal      | Variable                  | Valor               |
|------------|---------------------------|---------------------|
| Mensajería | `MESSAGING_ADAPTER`       | `twilio_whatsapp`   |
|            |                           | `telegram`          |
|            |                           | `meta_whatsapp`     |
| Calendario | `CALENDAR_ADAPTER`        | `google_calendar`   |
|            |                           | `mock` (demos)      |
| Storage    | `STORAGE_ADAPTER`         | `google_sheets`     |
|            |                           | `local_json`        |
| Email      | `EMAIL_ADAPTER`           | `smtp`              |
|            |                           | `gmail`             |

## Añadir un adaptador nuevo

1. Crear `src/adapters/<categoria>/MiAdaptador.ts`
2. Implementar la interfaz correspondiente (`MessagingAdapter`, `CalendarAdapter`, etc.)
3. Añadir el caso en `src/adapters/index.ts` (factory)
4. Añadir la opción en `src/config/index.ts` (zod enum)
5. Cambiar la variable de entorno — listo

Ejemplo mínimo de adaptador de mensajería:
```typescript
import { MessagingAdapter, IncomingMessage, OutgoingMessage } from '../../types'

export class MiAdaptador implements MessagingAdapter {
  readonly name = 'mi_adaptador'

  async send(message: OutgoingMessage): Promise<void> {
    // enviar mensaje...
  }

  parseIncoming(rawBody: unknown): IncomingMessage {
    // parsear webhook entrante...
  }

  validateWebhook(req: unknown): boolean {
    return true
  }
}
```

## Estructura del Google Spreadsheet

**Hoja "Info"** (columna A: campo, columna B: valor)

| campo             | valor                          |
|-------------------|-------------------------------|
| nombre            | Mi Empresa                    |
| descripcion       | Descripción de la empresa     |
| servicios         | Servicio 1, Servicio 2        |
| horario           | L-V 9:00-18:00                |
| direccion         | Calle Mayor 1, Madrid         |
| telefono          | +34 91 000 0000               |
| faq_pregunta_1    | ¿Tenéis parking?              |
| faq_respuesta_1   | Sí, parking gratuito          |

**Hoja "Precios"** (con cabecera en fila 1)

| nombre         | precio | moneda | descripcion          | categoria  |
|----------------|--------|--------|----------------------|------------|
| Servicio básico| 50     | €      | Incluye instalación  | Básico     |

## Comandos del propietario (desde su móvil)

| Comando   | Acción                          |
|-----------|---------------------------------|
| `#humano` | Pausa el bot en esa conversación|
| `#bot`    | Reactiva el bot                 |

## Deploy en Railway

```bash
# railway.toml ya incluido
railway up
```

## Rutas de admin

| Ruta                    | Método | Descripción                  |
|-------------------------|--------|------------------------------|
| `/webhook/:channel`     | POST   | Entrada de mensajes          |
| `/health`               | GET    | Estado del servidor          |
| `/admin/refresh-cache`  | POST   | Forzar recarga desde storage |
