import { Config } from '../config'

export interface BrandTokens {
  name: string
  logoUrl: string | undefined
  faviconUrl: string | undefined
  primary: string
  secondary: string
  bg: string
  surface: string
  surface2: string
  border: string
  text: string
  muted: string
  isDark: boolean
}

export function extractBrand(config: Config): BrandTokens {
  return {
    name:       config.BRAND_NAME,
    logoUrl:    config.BRAND_LOGO_URL,
    faviconUrl: config.BRAND_FAVICON_URL,
    primary:    config.BRAND_COLOR_PRIMARY,
    secondary:  config.BRAND_COLOR_SECONDARY,
    bg:         config.BRAND_COLOR_BG,
    surface:    config.BRAND_COLOR_SURFACE,
    surface2:   config.BRAND_COLOR_SURFACE2,
    border:     config.BRAND_COLOR_BORDER,
    text:       config.BRAND_COLOR_TEXT,
    muted:      config.BRAND_COLOR_MUTED,
    isDark:     config.BRAND_DARK_MODE === 'true',
  }
}

/** Genera el color de hover oscureciendo un hex en ~15% */
function darken(hex: string, amount = 0.15): string {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.max(0, ((n >> 16) & 255) - Math.round(255 * amount))
  const g = Math.max(0, ((n >> 8)  & 255) - Math.round(255 * amount))
  const b = Math.max(0, ( n        & 255) - Math.round(255 * amount))
  return `#${[r,g,b].map(x => x.toString(16).padStart(2,'0')).join('')}`
}

/** Devuelve negro o blanco según luminancia del fondo */
function contrastText(hex: string): string {
  const n = parseInt(hex.replace('#',''), 16)
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
  const lum = (0.299*r + 0.587*g + 0.114*b) / 255
  return lum > 0.5 ? '#111111' : '#ffffff'
}

export function generatePanelHtml(brand: BrandTokens): string {
  const btnText = contrastText(brand.primary)
  const primaryHover = darken(brand.primary)
  const borderStrong = darken(brand.border, -0.05)  // ligeramente más claro
  const green  = brand.isDark ? '#22c55e' : '#16a34a'
  const amber  = brand.isDark ? '#f59e0b' : '#d97706'
  const red    = brand.isDark ? '#ef4444' : '#dc2626'

  const logo = brand.logoUrl
    ? `<img src="${brand.logoUrl}" alt="${brand.name}" style="height:28px;object-fit:contain;max-width:140px">`
    : `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${brand.primary}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>`

  const favicon = brand.faviconUrl
    ? `<link rel="icon" href="${brand.faviconUrl}">`
    : ''

  return /* html */`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Panel · ${brand.name}</title>
${favicon}
<style>
  :root {
    --bg:       ${brand.bg};
    --surface:  ${brand.surface};
    --surface2: ${brand.surface2};
    --border:   ${brand.border};
    --border2:  ${borderStrong};
    --text:     ${brand.text};
    --muted:    ${brand.muted};
    --accent:   ${brand.primary};
    --accent2:  ${brand.secondary};
    --accent-hover: ${primaryHover};
    --btn-text: ${btnText};
    --green:    ${green};
    --amber:    ${amber};
    --red:      ${red};
    --radius: 10px;
    --sans: system-ui, -apple-system, 'Segoe UI', sans-serif;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:var(--bg);color:var(--text);font-family:var(--sans);font-size:14px;min-height:100vh}

  .shell{display:grid;grid-template-columns:220px 1fr;min-height:100vh}
  .sidebar{background:var(--surface);border-right:1px solid var(--border);padding:24px 0;display:flex;flex-direction:column;gap:4px;position:sticky;top:0;height:100vh;overflow-y:auto}
  .sidebar-logo{padding:0 20px 20px;border-bottom:1px solid var(--border);margin-bottom:8px;display:flex;align-items:center;gap:10px}
  .sidebar-logo-text{font-size:13px;color:var(--text);font-weight:600;line-height:1.3}
  .sidebar-logo-sub{font-size:11px;color:var(--muted);margin-top:1px}
  .nav-item{display:flex;align-items:center;gap:10px;padding:9px 20px;cursor:pointer;color:var(--muted);border-left:2px solid transparent;transition:all .15s;font-size:13px;user-select:none}
  .nav-item:hover{color:var(--text);background:var(--surface2)}
  .nav-item.active{color:var(--accent2);border-left-color:var(--accent);background:color-mix(in srgb, var(--accent) 10%, transparent)}
  .nav-item svg{width:16px;height:16px;flex-shrink:0}
  .main{overflow:auto}
  .page{display:none;padding:32px;max-width:980px}
  .page.active{display:block}

  .page-header{margin-bottom:28px}
  .page-header h1{font-size:22px;font-weight:600}
  .page-header p{color:var(--muted);margin-top:4px;font-size:13px}

  .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:28px}
  .stat{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px}
  .stat-label{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px}
  .stat-value{font-size:28px;font-weight:700;margin-top:6px;color:var(--text)}
  .stat-sub{font-size:12px;color:var(--muted);margin-top:2px}

  .table-wrap{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}
  table{width:100%;border-collapse:collapse}
  th{padding:12px 16px;text-align:left;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid var(--border);background:var(--surface2);font-weight:500}
  td{padding:13px 16px;border-bottom:1px solid var(--border);vertical-align:middle}
  tr:last-child td{border-bottom:none}
  tr:hover td{background:color-mix(in srgb, var(--accent) 3%, transparent)}
  .empty{text-align:center;color:var(--muted);padding:48px}

  .badge{display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:500}
  .badge-bot{background:color-mix(in srgb,var(--green) 15%,transparent);color:var(--green)}
  .badge-human{background:color-mix(in srgb,var(--amber) 15%,transparent);color:var(--amber)}
  .badge-dot{width:6px;height:6px;border-radius:50%;background:currentColor}

  .toggle{position:relative;width:36px;height:20px;flex-shrink:0}
  .toggle input{opacity:0;width:0;height:0;position:absolute}
  .toggle-track{position:absolute;inset:0;background:var(--border2);border-radius:10px;cursor:pointer;transition:background .2s}
  .toggle input:checked+.toggle-track{background:var(--accent)}
  .toggle-thumb{position:absolute;top:2px;left:2px;width:16px;height:16px;background:white;border-radius:50%;transition:transform .2s;pointer-events:none}
  .toggle input:checked~.toggle-thumb{transform:translateX(16px)}

  .card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:24px;margin-bottom:20px}
  .card-title{font-size:14px;font-weight:600;margin-bottom:18px;display:flex;align-items:center;gap:8px;color:var(--text)}
  .card-title svg{color:var(--accent2);flex-shrink:0}

  .field{margin-bottom:16px}
  .field label{display:block;font-size:11px;color:var(--muted);margin-bottom:6px;font-weight:500;text-transform:uppercase;letter-spacing:.4px}
  .field input,.field textarea,.field select{width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:14px;padding:9px 12px;outline:none;font-family:var(--sans);transition:border-color .15s}
  .field input:focus,.field textarea:focus,.field select:focus{border-color:var(--accent)}
  .field textarea{resize:vertical;min-height:80px;line-height:1.5}
  .field-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}

  .tags-wrap{display:flex;flex-wrap:wrap;gap:6px;padding:8px;background:var(--surface2);border:1px solid var(--border);border-radius:7px;min-height:42px;cursor:text;transition:border-color .15s}
  .tags-wrap:focus-within{border-color:var(--accent)}
  .tag{display:inline-flex;align-items:center;gap:5px;background:color-mix(in srgb,var(--accent) 20%,transparent);color:var(--accent2);border-radius:5px;padding:2px 8px;font-size:12px}
  .tag-remove{cursor:pointer;opacity:.6;line-height:1;font-size:14px}
  .tag-remove:hover{opacity:1}
  .tag-input{background:none;border:none;outline:none;color:var(--text);font-size:14px;font-family:var(--sans);min-width:120px;flex:1;padding:1px 0}

  .faq-item{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:14px;margin-bottom:10px;position:relative}
  .faq-remove{position:absolute;top:10px;right:10px;background:none;border:none;color:var(--muted);cursor:pointer;font-size:16px;line-height:1;padding:2px 6px;border-radius:4px}
  .faq-remove:hover{color:var(--red);background:color-mix(in srgb,var(--red) 12%,transparent)}

  .price-header{display:grid;grid-template-columns:2fr 90px 55px 2fr 110px 36px;gap:8px;margin-bottom:8px}
  .price-header span{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;padding:0 10px}
  .price-item{display:grid;grid-template-columns:2fr 90px 55px 2fr 110px 36px;gap:8px;align-items:center;margin-bottom:8px}
  .price-item input,.price-item select{background:var(--surface2);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:13px;padding:7px 10px;font-family:var(--sans);outline:none;width:100%;transition:border-color .15s}
  .price-item input:focus,.price-item select:focus{border-color:var(--accent)}

  .btn{display:inline-flex;align-items:center;gap:7px;padding:9px 18px;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;border:none;font-family:var(--sans);transition:all .15s}
  .btn-primary{background:var(--accent);color:var(--btn-text)}
  .btn-primary:hover{background:var(--accent-hover)}
  .btn-secondary{background:var(--surface2);color:var(--text);border:1px solid var(--border)}
  .btn-secondary:hover{border-color:var(--border2)}
  .btn-danger{background:color-mix(in srgb,var(--red) 12%,transparent);color:var(--red);border:1px solid color-mix(in srgb,var(--red) 25%,transparent)}
  .btn-danger:hover{background:color-mix(in srgb,var(--red) 22%,transparent)}
  .btn-sm{padding:5px 12px;font-size:12px}
  .btn-icon{width:32px;height:32px;padding:0;justify-content:center}
  .btn-row{display:flex;gap:10px;margin-top:24px;align-items:center}

  .toast{position:fixed;bottom:24px;right:24px;background:var(--surface2);border:1px solid var(--border);color:var(--text);border-radius:10px;padding:12px 18px;font-size:13px;display:flex;align-items:center;gap:10px;box-shadow:0 8px 32px rgba(0,0,0,.4);transform:translateY(80px);opacity:0;transition:all .3s;z-index:999}
  .toast.show{transform:translateY(0);opacity:1}
  .toast-icon{width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0}
  .toast-ok .toast-icon{background:color-mix(in srgb,var(--green) 20%,transparent);color:var(--green)}
  .toast-err .toast-icon{background:color-mix(in srgb,var(--red) 20%,transparent);color:var(--red)}

  .refresh-row{display:flex;align-items:center;gap:10px;margin-bottom:20px}
  .spin{animation:spin .8s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}
  .time{color:var(--muted);font-size:12px}
  .phone{font-family:monospace;font-size:13px;color:var(--accent2)}
  .divider{height:1px;background:var(--border);margin:8px 0}
</style>
</head>
<body>
<div class="shell">

  <aside class="sidebar">
    <div class="sidebar-logo">
      ${logo}
      <div>
        <div class="sidebar-logo-text">${brand.name}</div>
        <div class="sidebar-logo-sub">Panel de administración</div>
      </div>
    </div>
    <div class="nav-item active" onclick="showPage('conversations',this)">
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
      Conversaciones
    </div>
    <div class="nav-item" onclick="showPage('company',this)">
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
      Empresa
    </div>
    <div class="nav-item" onclick="showPage('pricing',this)">
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      Precios
    </div>
    <div class="nav-item" onclick="showPage('faqs',this)">
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      Preguntas frecuentes
    </div>
    <div class="divider" style="margin:8px 20px"></div>
    <div class="nav-item" onclick="showPage('brand',this)">
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/></svg>
      Personalización
    </div>
  </aside>

  <main class="main">

    <!-- CONVERSACIONES -->
    <div class="page active" id="page-conversations">
      <div class="page-header">
        <h1>Conversaciones</h1>
        <p>Ve quién está hablando con el agente y toma el control cuando lo necesites.</p>
      </div>
      <div class="stats">
        <div class="stat"><div class="stat-label">Total</div><div class="stat-value" id="stat-total">—</div><div class="stat-sub">conversaciones</div></div>
        <div class="stat"><div class="stat-label">Modo humano</div><div class="stat-value" id="stat-human">—</div><div class="stat-sub">activo ahora</div></div>
        <div class="stat"><div class="stat-label">Últimas 24h</div><div class="stat-value" id="stat-24h">—</div><div class="stat-sub">conversaciones activas</div></div>
      </div>
      <div class="refresh-row">
        <button class="btn btn-secondary btn-sm" onclick="loadAll()">
          <svg id="refresh-icon" width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          Actualizar
        </button>
        <span class="time" id="last-update"></span>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Contacto</th><th>Último mensaje</th><th>Actividad</th><th>Mensajes</th><th>Estado</th><th>Control</th></tr></thead>
          <tbody id="conv-table"><tr><td colspan="6" class="empty">Cargando…</td></tr></tbody>
        </table>
      </div>
    </div>

    <!-- EMPRESA -->
    <div class="page" id="page-company">
      <div class="page-header"><h1>Información de empresa</h1><p>El agente usa estos datos para responder. Los cambios se aplican al instante.</p></div>
      <div class="card">
        <div class="card-title"><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>Datos básicos</div>
        <div class="field"><label>Nombre de la empresa</label><input id="c-name" type="text" placeholder="Mi Empresa SL"></div>
        <div class="field"><label>Descripción</label><textarea id="c-desc" placeholder="Descripción breve para que el agente conozca tu negocio…"></textarea></div>
        <div class="field-row">
          <div class="field"><label>Teléfono</label><input id="c-phone" type="text" placeholder="+34 600 000 000"></div>
          <div class="field"><label>Dirección</label><input id="c-address" type="text" placeholder="Calle Mayor 1, Valencia"></div>
        </div>
        <div class="field"><label>Horario</label><input id="c-schedule" type="text" placeholder="Lunes a Viernes 9:00–18:00, Sábados 10:00–14:00"></div>
      </div>
      <div class="card">
        <div class="card-title"><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>Servicios</div>
        <div class="field">
          <label>Escribe un servicio y pulsa Enter</label>
          <div class="tags-wrap" id="services-wrap" onclick="document.getElementById('svc-input').focus()">
            <input id="svc-input" class="tag-input" placeholder="Añadir servicio…" onkeydown="handleTagKey(event)">
          </div>
        </div>
      </div>
      <div class="btn-row">
        <button class="btn btn-primary" onclick="saveCompany()"><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>Guardar cambios</button>
        <button class="btn btn-secondary" onclick="loadCompany()">Descartar</button>
      </div>
    </div>

    <!-- PRECIOS -->
    <div class="page" id="page-pricing">
      <div class="page-header"><h1>Tarifas y precios</h1><p>El agente consultará esta lista cuando alguien pregunte por precios.</p></div>
      <div class="card">
        <div class="price-header"><span>Servicio / producto</span><span>Precio</span><span>Moneda</span><span>Descripción</span><span>Categoría</span><span></span></div>
        <div id="price-list"></div>
        <button class="btn btn-secondary btn-sm" style="margin-top:12px" onclick="addPriceRow()"><svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>Añadir línea</button>
      </div>
      <div class="btn-row">
        <button class="btn btn-primary" onclick="savePricing()"><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>Guardar precios</button>
        <button class="btn btn-secondary" onclick="loadCompany()">Descartar</button>
      </div>
    </div>

    <!-- FAQs -->
    <div class="page" id="page-faqs">
      <div class="page-header"><h1>Preguntas frecuentes</h1><p>El agente usará estas respuestas exactas cuando un cliente haga estas preguntas.</p></div>
      <div class="card">
        <div id="faq-list"></div>
        <button class="btn btn-secondary btn-sm" style="margin-top:4px" onclick="addFaq()"><svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>Añadir pregunta</button>
      </div>
      <div class="btn-row">
        <button class="btn btn-primary" onclick="saveFaqs()"><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>Guardar</button>
        <button class="btn btn-secondary" onclick="loadCompany()">Descartar</button>
      </div>
    </div>

    <!-- PERSONALIZACIÓN -->
    <div class="page" id="page-brand">
      <div class="page-header"><h1>Personalización del panel</h1><p>Cambia los colores y el logo en el archivo <code style="background:var(--surface2);padding:2px 6px;border-radius:4px;font-size:12px">.env</code> y reinicia el servidor.</p></div>
      <div class="card">
        <div class="card-title"><svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/></svg>Variables de marca</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          ${[
            ['BRAND_NAME', brand.name, 'Nombre mostrado en el panel'],
            ['BRAND_LOGO_URL', brand.logoUrl||'', 'URL del logo (PNG/SVG, altura ~28px)'],
            ['BRAND_FAVICON_URL', brand.faviconUrl||'', 'URL del favicon'],
            ['BRAND_COLOR_PRIMARY', brand.primary, 'Color principal (botones, accent)'],
            ['BRAND_COLOR_SECONDARY', brand.secondary, 'Color secundario (hover, links)'],
            ['BRAND_COLOR_BG', brand.bg, 'Fondo general'],
            ['BRAND_COLOR_SURFACE', brand.surface, 'Fondo de tarjetas'],
            ['BRAND_COLOR_SURFACE2', brand.surface2, 'Fondo de inputs y filas'],
            ['BRAND_COLOR_BORDER', brand.border, 'Color de bordes'],
            ['BRAND_COLOR_TEXT', brand.text, 'Texto principal'],
            ['BRAND_COLOR_MUTED', brand.muted, 'Texto secundario'],
          ].map(([k,v,desc]) => `
            <div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:14px">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                ${(k as string).includes('COLOR') ? `<div style="width:14px;height:14px;border-radius:3px;background:${v};border:1px solid var(--border);flex-shrink:0"></div>` : ''}
                <code style="font-size:12px;color:var(--accent2)">${k}</code>
              </div>
              <div style="font-size:13px;color:var(--text);margin-bottom:2px">${v||'<em style=color:var(--muted)>no definido</em>'}</div>
              <div style="font-size:11px;color:var(--muted)">${desc}</div>
            </div>
          `).join('')}
        </div>
        <div style="margin-top:20px;padding:14px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;font-size:12px;color:var(--muted);line-height:1.7">
          <strong style="color:var(--text)">Ejemplo para una clínica dental:</strong><br>
          BRAND_NAME=Clínica Dental Pérez<br>
          BRAND_COLOR_PRIMARY=#0ea5e9<br>
          BRAND_COLOR_SECONDARY=#38bdf8<br>
          BRAND_COLOR_BG=#f8fafc<br>
          BRAND_COLOR_SURFACE=#ffffff<br>
          BRAND_COLOR_SURFACE2=#f1f5f9<br>
          BRAND_COLOR_TEXT=#0f172a<br>
          BRAND_DARK_MODE=false
        </div>
      </div>
    </div>

  </main>
</div>

<div class="toast" id="toast">
  <div class="toast-icon" id="toast-icon"></div>
  <span id="toast-msg"></span>
</div>

<script>
let companyData={}, pricingData=[], services=[], faqs=[]

function showPage(id,el){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'))
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'))
  document.getElementById('page-'+id).classList.add('active')
  el.classList.add('active')
  if(id==='conversations') loadAll()
}

function toast(msg,ok=true){
  const el=document.getElementById('toast')
  const icon=document.getElementById('toast-icon')
  document.getElementById('toast-msg').textContent=msg
  el.className='toast show '+(ok?'toast-ok':'toast-err')
  icon.innerHTML=ok
    ?'<svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>'
    :'<svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>'
  clearTimeout(el._t)
  el._t=setTimeout(()=>el.classList.remove('show'),3000)
}

async function api(path,opts={}){
  const r=await fetch('/admin/api'+path,{headers:{'Content-Type':'application/json'},...opts})
  if(!r.ok) throw new Error(await r.text())
  return r.json()
}

async function loadAll(){
  const icon=document.getElementById('refresh-icon')
  icon.classList.add('spin')
  try{
    const [stats,convs]=await Promise.all([api('/stats'),api('/conversations')])
    document.getElementById('stat-total').textContent=stats.totalConversations
    document.getElementById('stat-human').textContent=stats.humanModeActive
    document.getElementById('stat-24h').textContent=stats.activeLast24h
    renderConversations(convs)
    document.getElementById('last-update').textContent='Actualizado '+new Date().toLocaleTimeString('es-ES')
  }catch(e){toast('Error cargando datos',false)}
  icon.classList.remove('spin')
}

function renderConversations(convs){
  const tbody=document.getElementById('conv-table')
  if(!convs.length){tbody.innerHTML='<tr><td colspan="6" class="empty">Sin conversaciones todavía.</td></tr>';return}
  tbody.innerHTML=convs.map(c=>\`
    <tr>
      <td><span class="phone">\${esc(c.userId)}</span></td>
      <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted)">\${esc(c.preview||'—')}</td>
      <td class="time">\${timeAgo(c.lastActivity)}</td>
      <td style="text-align:center">\${c.messageCount}</td>
      <td><span class="badge \${c.humanMode?'badge-human':'badge-bot'}"><span class="badge-dot"></span>\${c.humanMode?'Humano':'Bot'}</span></td>
      <td>
        <label class="toggle">
          <input type="checkbox" \${c.humanMode?'checked':''} onchange="toggleHuman('\${c.userId}','\${c.channel}',this.checked)">
          <div class="toggle-track"></div><div class="toggle-thumb"></div>
        </label>
      </td>
    </tr>
  \`).join('')
}

async function toggleHuman(userId,channel,enabled){
  try{
    await api(\`/conversations/\${encodeURIComponent(userId)}/human-mode\`,{method:'POST',body:JSON.stringify({channel,enabled})})
    toast(enabled?'Modo humano activado':'Bot reactivado')
    setTimeout(loadAll,400)
  }catch(e){toast('Error cambiando estado',false)}
}

async function loadCompany(){
  try{
    const {company,pricing}=await api('/company')
    companyData=company; pricingData=pricing
    services=[...(company.services||[])]; faqs=[...(company.faqs||[])]
    document.getElementById('c-name').value=company.name||''
    document.getElementById('c-desc').value=company.description||''
    document.getElementById('c-phone').value=company.phone||''
    document.getElementById('c-address').value=company.address||''
    document.getElementById('c-schedule').value=company.schedule||''
    renderServices(); renderPricing(); renderFaqs()
  }catch(e){toast('Error cargando empresa',false)}
}

async function saveCompany(){
  const updated={...companyData,name:document.getElementById('c-name').value.trim(),description:document.getElementById('c-desc').value.trim(),phone:document.getElementById('c-phone').value.trim(),address:document.getElementById('c-address').value.trim(),schedule:document.getElementById('c-schedule').value.trim(),services,faqs}
  try{await api('/company',{method:'POST',body:JSON.stringify({company:updated,pricing:pricingData})});companyData=updated;toast('Cambios guardados')}
  catch(e){toast('Error guardando',false)}
}

function renderServices(){
  const wrap=document.getElementById('services-wrap')
  const input=document.getElementById('svc-input')
  wrap.innerHTML=''
  services.forEach((s,i)=>{
    const tag=document.createElement('span');tag.className='tag'
    tag.innerHTML=esc(s)+' <span class="tag-remove" onclick="rmService('+i+')">×</span>'
    wrap.appendChild(tag)
  })
  wrap.appendChild(input)
}
function handleTagKey(e){
  if(e.key==='Enter'||e.key===','){e.preventDefault();const v=e.target.value.trim().replace(/,$/,'');if(v){services.push(v);e.target.value='';renderServices();document.getElementById('svc-input').focus()}}
  else if(e.key==='Backspace'&&!e.target.value&&services.length){services.pop();renderServices();document.getElementById('svc-input').focus()}
}
function rmService(i){services.splice(i,1);renderServices()}

function renderPricing(){
  document.getElementById('price-list').innerHTML=pricingData.map((p,i)=>\`
    <div class="price-item">
      <input value="\${ea(p.name)}" placeholder="Nombre" onchange="pricingData[\${i}].name=this.value">
      <input type="number" value="\${p.price}" placeholder="0" onchange="pricingData[\${i}].price=parseFloat(this.value)||0">
      <select onchange="pricingData[\${i}].currency=this.value">
        <option \${p.currency==='€'?'selected':''}>€</option>
        <option \${p.currency==='$'?'selected':''}>$</option>
        <option \${p.currency==='£'?'selected':''}>£</option>
      </select>
      <input value="\${ea(p.description||'')}" placeholder="Descripción" onchange="pricingData[\${i}].description=this.value">
      <input value="\${ea(p.category||'')}" placeholder="Categoría" onchange="pricingData[\${i}].category=this.value">
      <button class="btn btn-icon btn-danger" onclick="rmPrice(\${i})"><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>
    </div>
  \`).join('')
}
function addPriceRow(){pricingData.push({name:'',price:0,currency:'€',description:'',category:''});renderPricing();document.querySelector('#price-list .price-item:last-child input')?.focus()}
function rmPrice(i){pricingData.splice(i,1);renderPricing()}
async function savePricing(){
  try{await api('/company',{method:'POST',body:JSON.stringify({company:companyData,pricing:pricingData})});toast('Precios actualizados')}
  catch(e){toast('Error guardando',false)}
}

function renderFaqs(){
  const list=document.getElementById('faq-list')
  if(!faqs.length){list.innerHTML='<p style="color:var(--muted);font-size:13px;padding:8px 0 16px">Sin preguntas. Añade las dudas más comunes de tus clientes.</p>';return}
  list.innerHTML=faqs.map((f,i)=>\`
    <div class="faq-item">
      <button class="faq-remove" onclick="rmFaq(\${i})">×</button>
      <div class="field" style="margin-bottom:10px"><label>Pregunta</label><input value="\${ea(f.question)}" placeholder="¿Cuánto tarda el servicio?" onchange="faqs[\${i}].question=this.value"></div>
      <div class="field" style="margin-bottom:0"><label>Respuesta</label><textarea onchange="faqs[\${i}].answer=this.value">\${esc(f.answer)}</textarea></div>
    </div>
  \`).join('')
}
function addFaq(){faqs.push({question:'',answer:''});renderFaqs();document.querySelector('#faq-list .faq-item:last-child input')?.focus()}
function rmFaq(i){faqs.splice(i,1);renderFaqs()}
async function saveFaqs(){
  const updated={...companyData,faqs,services}
  try{await api('/company',{method:'POST',body:JSON.stringify({company:updated,pricing:pricingData})});companyData=updated;toast('Preguntas guardadas')}
  catch(e){toast('Error guardando',false)}
}

function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function ea(s){return esc(s)}
function timeAgo(d){const m=Math.floor((Date.now()-new Date(d).getTime())/60000);if(m<1)return'ahora mismo';if(m<60)return\`hace \${m}m\`;const h=Math.floor(m/60);if(h<24)return\`hace \${h}h\`;return\`hace \${Math.floor(h/24)}d\`}

loadAll(); loadCompany()
setInterval(loadAll,30000)
</script>
</body>
</html>`
}
