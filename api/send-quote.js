// Manda la cotizacion recien guardada al correo del cliente, con copia a KASTON.
//
// El cotizador la llama justo despues de guardar un proyecto nuevo. El precio y los
// datos NO llegan desde el navegador: se leen de la base con el token del cliente.
// Asi nadie puede mandarse (ni mandarle a KASTON) una cotizacion inventada, y las
// reglas por fila de Supabase garantizan que solo se lee un proyecto propio.
//
// Mientras no exista RESEND_API_KEY en Vercel responde 503 y no hace nada: el
// cotizador guarda igual. Sin RESEND_FROM sale desde el remitente de pruebas de
// Resend, que solo entrega al correo de la cuenta de Resend (la copia a KASTON
// llega; al cliente no, hasta verificar kastonproyectos.com).
const SUPA_URL = 'https://naxvanbiwgwfraxqtsof.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5heHZhbmJpd2d3ZnJheHF0c29mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxODUxNDQsImV4cCI6MjA5MTc2MTE0NH0.jMoSNrVwKHBuPxTDxsqsysuV0I7c0t6DNk-7bFbTwvw';

const SITIO = 'https://www.kastonproyectos.com';
const WHATSAPP = '573188978552';
const TEJAS_POR_M2 = 42;

const COLORES = { grafito: 'Negro Grafito', basalto: 'Gris Basalto' };
const ZONAS = {
    metro: 'Hasta 25 km de la planta',
    afueras: 'Entre 25 y 60 km de la planta',
    lejana: 'A más de 60 km de la planta'
};

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return res.status(503).json({ enviado: false, motivo: 'Falta RESEND_API_KEY en Vercel' });

    // Mismo formato que /api/projects: token en el cuerpo y text/plain, por Safari.
    let datos = req.body;
    if (typeof datos === 'string') {
        try { datos = JSON.parse(datos); } catch (e) { datos = {}; }
    }
    const { token, projectId } = datos || {};
    if (!token) return res.status(401).json({ error: 'No hay sesión' });
    if (!projectId) return res.status(400).json({ error: 'Falta el id del proyecto' });
    if (token.length > 7000) return res.status(413).json({ error: 'La sesión pesa demasiado' });

    const cabeceras = { apikey: SUPA_KEY, Authorization: `Bearer ${token}` };

    try {
        const usuarioRes = await fetch(`${SUPA_URL}/auth/v1/user`, { headers: cabeceras });
        if (!usuarioRes.ok) return res.status(401).json({ error: 'Sesión no válida' });
        const usuario = await usuarioRes.json();
        if (!usuario || !usuario.email) return res.status(401).json({ error: 'La cuenta no tiene correo' });

        const filaRes = await fetch(
            `${SUPA_URL}/rest/v1/projects?id=eq.${encodeURIComponent(projectId)}&select=id,client_name,project_m2,project_data`,
            { headers: cabeceras }
        );
        if (!filaRes.ok) return res.status(502).json({ error: 'No se pudo leer el proyecto' });
        const filas = await filaRes.json();
        const fila = Array.isArray(filas) ? filas[0] : null;
        if (!fila) return res.status(404).json({ error: 'Proyecto no encontrado' });

        const cotizacion = armarCotizacion(fila, usuario);
        const remitente = process.env.RESEND_FROM || 'KASTON <onboarding@resend.dev>';
        const copiaKaston = process.env.KASTON_COPY_EMAIL || 'kaston.proyectos@gmail.com';

        const [cliente, kaston] = await Promise.allSettled([
            enviar(apiKey, `cotizacion-cliente-${fila.id}`, {
                from: remitente,
                to: [usuario.email],
                reply_to: copiaKaston,
                subject: `Tu cotización KASTON: ${cotizacion.nombre}`,
                html: correoCliente(cotizacion),
                text: textoCliente(cotizacion)
            }),
            enviar(apiKey, `cotizacion-kaston-${fila.id}`, {
                from: remitente,
                to: [copiaKaston],
                reply_to: usuario.email,
                subject: `Nueva cotización: ${cotizacion.nombre} · ${cotizacion.area} · ${cotizacion.modalidad}`,
                html: correoKaston(cotizacion),
                text: textoKaston(cotizacion)
            })
        ]);

        const resultado = r => (r.status === 'fulfilled' ? 'enviado' : r.reason.message);
        const ok = cliente.status === 'fulfilled' || kaston.status === 'fulfilled';
        return res.status(ok ? 200 : 502).json({ cliente: resultado(cliente), kaston: resultado(kaston) });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}

async function enviar(apiKey, idempotencia, correo) {
    const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            // Si el cotizador llama dos veces por el mismo proyecto, Resend manda uno solo.
            'Idempotency-Key': idempotencia
        },
        body: JSON.stringify(correo)
    });
    if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
    return r.json();
}

function armarCotizacion(fila, usuario) {
    let p = {};
    try { p = typeof fila.project_data === 'string' ? JSON.parse(fila.project_data) : (fila.project_data || {}); } catch (e) { p = {}; }

    const m2 = Number(fila.project_m2) || Number(p.area) || 0;
    const todoCosto = p.modality === 'full';
    const divisa = p.divisa || 'COP';
    const precio = p.inversion_tejas === null || p.inversion_tejas === undefined ? null : Number(p.inversion_tejas);

    const area = p.unidad === 'ft2'
        ? `${numero(p.area, 0)} ft² (${numero(m2, 1)} m²)`
        : `${numero(m2, 1)} m²`;

    return {
        nombre: (p.nombre || fila.client_name || 'Proyecto KASTON').toString().slice(0, 120),
        cliente: (usuario.user_metadata && (usuario.user_metadata.full_name || usuario.user_metadata.name)) || '',
        correoCliente: usuario.email,
        area,
        m2,
        tejas: numero(Math.ceil(m2 * TEJAS_POR_M2), 0),
        modalidad: todoCosto ? 'Todo costo instalado' : 'Solo tejas',
        cubre: todoCosto
            ? 'Las tejas, los materiales y el instalador.'
            : 'El suministro de las tejas. La instalación va por tu cuenta, con nuestro manual.',
        transporte: todoCosto
            ? 'El transporte de las tejas hasta tu obra no está incluido. Escríbenos con la ubicación y lo calculamos.'
            : 'El transporte no está incluido. Escríbenos con la ubicación de tu obra y lo calculamos.',
        zona: todoCosto ? (ZONAS[p.zoneId] || '') : '',
        distancia: todoCosto && Number(p.geoKm) ? `${numero(p.geoKm, 1)} km` : '',
        color: COLORES[p.selectedColor] || '',
        precio: precio === null || isNaN(precio) ? 'Por cotizar con un asesor' : moneda(precio, divisa),
        fecha: p.fecha || new Date().toISOString().split('T')[0]
    };
}

// Separador de miles con punto y decimales con coma, como en el cotizador.
function numero(valor, decimales) {
    const n = Number(valor);
    if (isNaN(n)) return String(valor);
    const [entero, fraccion] = Math.abs(n).toFixed(decimales).split('.');
    const miles = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const limpio = fraccion && /[1-9]/.test(fraccion) ? `${miles},${fraccion}` : miles;
    return (n < 0 ? '-' : '') + limpio;
}

function moneda(valor, divisa) {
    const simbolo = divisa === 'EUR' ? '€' : '$';
    return `${simbolo} ${numero(valor, divisa === 'COP' ? 0 : 2)} ${divisa}`;
}

function escapar(texto) {
    return String(texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function enlaceWhatsApp(c) {
    const mensaje = `Hola KASTON, acabo de guardar mi cotización "${c.nombre}" de ${c.area} (${c.modalidad}). Quiero hablar con un asesor.`;
    return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
}

// ---------------------------------------------------------------------------
// Plantillas. Tablas y estilos en linea porque Gmail y Outlook ignoran casi todo
// lo demas. Oswald e Inter solo cargan en Apple Mail; el resto usa Arial.
// ---------------------------------------------------------------------------

const TITULO = "font-family:Oswald,'Arial Narrow',Arial,sans-serif;text-transform:uppercase;letter-spacing:1px;";
const CUERPO = 'font-family:Inter,Arial,Helvetica,sans-serif;';

function fila(etiqueta, valor) {
    if (!valor) return '';
    return `<tr>
      <td style="${CUERPO}padding:12px 0;border-top:1px solid #262626;color:#8a8a8a;font-size:13px;width:42%;vertical-align:top;">${escapar(etiqueta)}</td>
      <td style="${CUERPO}padding:12px 0;border-top:1px solid #262626;color:#ffffff;font-size:14px;vertical-align:top;">${escapar(valor)}</td>
    </tr>`;
}

function marco(preencabezado, contenido) {
    return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@600;700&family=Inter:wght@400;600&display=swap" rel="stylesheet">
<title>KASTON</title>
</head>
<body style="margin:0;padding:0;background:#000000;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapar(preencabezado)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#000000" style="background:#000000;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
      <tr><td align="center" style="padding:8px 0 28px;">
        <img src="${SITIO}/email/kaston-logo.png" width="220" alt="KASTON" style="display:block;width:220px;max-width:60%;height:auto;border:0;">
      </td></tr>
      ${contenido}
      <tr><td style="${CUERPO}padding:32px 8px 0;color:#6e6e6e;font-size:12px;line-height:1.7;text-align:center;">
        KASTON · Innovación para siempre<br>
        Carrera 46 #50-75, Los Naranjos, Itagüí, Antioquia<br>
        <a href="mailto:kaston.proyectos@gmail.com" style="color:#8a8a8a;">kaston.proyectos@gmail.com</a> · +57 318 897 8552<br><br>
        Recibes este correo porque guardaste una cotización en
        <a href="${SITIO}" style="color:#8a8a8a;">kastonproyectos.com</a>.
        <a href="${SITIO}/privacidad" style="color:#8a8a8a;">Política de privacidad</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function correoCliente(c) {
    const saludo = c.cliente ? `Hola, ${escapar(c.cliente.split(' ')[0])}.` : 'Hola.';
    const contenido = `
      <tr><td bgcolor="#111111" style="background:#111111;border:1px solid #2a2118;border-radius:12px;padding:36px 32px;">
        <div style="${CUERPO}color:#C18A68;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:600;">Cotización guardada</div>
        <h1 style="${TITULO}margin:10px 0 18px;color:#ffffff;font-size:28px;line-height:1.15;">Tu techo, en números</h1>
        <p style="${CUERPO}margin:0 0 26px;color:#d6d6d6;font-size:15px;line-height:1.65;">
          ${saludo} Guardamos tu proyecto <strong style="color:#ffffff;">${escapar(c.nombre)}</strong>. Aquí tienes el resumen para que lo tengas a mano.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-left:3px solid #C18A68;">
          <tr><td style="padding:4px 0 4px 18px;">
            <div style="${CUERPO}color:#8a8a8a;font-size:12px;letter-spacing:2px;text-transform:uppercase;">${escapar(c.modalidad)}</div>
            <div style="${TITULO}color:#C18A68;font-size:34px;line-height:1.1;margin-top:6px;letter-spacing:0;">${escapar(c.precio)}</div>
            <div style="${CUERPO}color:#bcbcbc;font-size:13px;margin-top:6px;">Para ${escapar(c.area)}</div>
          </td></tr>
        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;">
          ${fila('Proyecto', c.nombre)}
          ${fila('Área', c.area)}
          ${fila('Tejas necesarias', `${c.tejas} (42 por m²)`)}
          ${fila('Modalidad', c.modalidad)}
          ${fila('Qué cubre', c.cubre)}
          ${fila('Zona de la obra', c.zona)}
          ${fila('Color', c.color)}
          ${fila('Fecha', c.fecha)}
        </table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:26px;">
          <tr><td bgcolor="#1a1a1a" style="${CUERPO}background:#1a1a1a;border-radius:8px;padding:14px 16px;color:#d6d6d6;font-size:13px;line-height:1.6;">
            ${escapar(c.transporte)}
          </td></tr>
        </table>

        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:30px;">
          <tr><td bgcolor="#C18A68" style="border-radius:8px;">
            <a href="${enlaceWhatsApp(c)}" style="${TITULO}display:inline-block;padding:15px 30px;color:#000000;font-size:14px;letter-spacing:2px;text-decoration:none;font-weight:700;">Hablar con un asesor</a>
          </td></tr>
        </table>
        <p style="${CUERPO}margin:16px 0 0;font-size:13px;">
          <a href="${SITIO}/cotizador" style="color:#C18A68;">Ver mis proyectos</a>
        </p>

        <p style="${CUERPO}margin:26px 0 0;color:#6e6e6e;font-size:12px;line-height:1.6;">
          Es un presupuesto estimado. El valor final lo confirma un asesor al revisar tu obra.
        </p>
      </td></tr>`;
    return marco(`Tu cotización de ${c.area} quedó guardada: ${c.precio}.`, contenido);
}

function correoKaston(c) {
    const contenido = `
      <tr><td bgcolor="#111111" style="background:#111111;border:1px solid #2a2118;border-radius:12px;padding:32px;">
        <div style="${CUERPO}color:#C18A68;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:600;">Nueva cotización</div>
        <h1 style="${TITULO}margin:10px 0 6px;color:#ffffff;font-size:24px;line-height:1.2;">${escapar(c.nombre)}</h1>
        <div style="${TITULO}color:#C18A68;font-size:26px;letter-spacing:0;margin:10px 0 20px;">${escapar(c.precio)}</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${fila('Cliente', c.cliente)}
          ${fila('Correo', c.correoCliente)}
          ${fila('Área', c.area)}
          ${fila('Tejas', `${c.tejas} (42 por m²)`)}
          ${fila('Modalidad', c.modalidad)}
          ${fila('Zona', c.zona)}
          ${fila('Distancia a la planta', c.distancia)}
          ${fila('Color', c.color)}
          ${fila('Fecha', c.fecha)}
        </table>
        <p style="${CUERPO}margin:24px 0 0;color:#bcbcbc;font-size:13px;line-height:1.6;">
          Responde este correo y le llega directo al cliente. El transporte no está incluido en el precio.
        </p>
      </td></tr>`;
    return marco(`${c.nombre} · ${c.area} · ${c.precio}`, contenido);
}

function textoCliente(c) {
    return [
        c.cliente ? `Hola, ${c.cliente.split(' ')[0]}.` : 'Hola.',
        `Guardamos tu proyecto "${c.nombre}". Este es el resumen:`,
        '',
        `${c.modalidad}: ${c.precio}`,
        `Área: ${c.area}`,
        `Tejas necesarias: ${c.tejas} (42 por m²)`,
        `Qué cubre: ${c.cubre}`,
        c.zona ? `Zona de la obra: ${c.zona}` : '',
        c.color ? `Color: ${c.color}` : '',
        `Fecha: ${c.fecha}`,
        '',
        c.transporte,
        '',
        `Hablar con un asesor: ${enlaceWhatsApp(c)}`,
        `Ver mis proyectos: ${SITIO}/cotizador`,
        '',
        'Es un presupuesto estimado. El valor final lo confirma un asesor al revisar tu obra.',
        '',
        'KASTON · Innovación para siempre',
        'kaston.proyectos@gmail.com · +57 318 897 8552'
    ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');
}

function textoKaston(c) {
    return [
        `Nueva cotización: ${c.nombre}`,
        `Precio: ${c.precio}`,
        '',
        c.cliente ? `Cliente: ${c.cliente}` : '',
        `Correo: ${c.correoCliente}`,
        `Área: ${c.area}`,
        `Tejas: ${c.tejas} (42 por m²)`,
        `Modalidad: ${c.modalidad}`,
        c.zona ? `Zona: ${c.zona}` : '',
        c.distancia ? `Distancia a la planta: ${c.distancia}` : '',
        c.color ? `Color: ${c.color}` : '',
        `Fecha: ${c.fecha}`,
        '',
        'Responde este correo y le llega directo al cliente.'
    ].filter(Boolean).join('\n');
}
