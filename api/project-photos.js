// Fotos del techo de cada proyecto guardado, en el almacenamiento privado de Supabase.
//
// Mismo esquema que projects.js: el navegador nunca habla directo con supabase.co
// (Safari lo corta), el token del cliente viaja en el cuerpo y se reenvia tal cual.
// Las reglas del bucket solo dejan tocar la carpeta propia:
//     fotos-techo/<id del usuario>/<id del proyecto>/<n>.jpg
// asi que nadie puede ver ni borrar las fotos de otro por pasar por aqui.
//
// Acciones:
//   list    → { fotos: ['1.jpg', '2.jpg', ...] }
//   get     → la foto (image/jpeg)
//   upload  → sube una foto: { indice: 1..6, foto: JPG en base64 }
//   clear   → borra todas las fotos del proyecto
const SUPA_URL = 'https://naxvanbiwgwfraxqtsof.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5heHZhbmJpd2d3ZnJheHF0c29mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxODUxNDQsImV4cCI6MjA5MTc2MTE0NH0.jMoSNrVwKHBuPxTDxsqsysuV0I7c0t6DNk-7bFbTwvw';

const BUCKET = 'fotos-techo';
const MAX_FOTOS = 6;
const MAX_LARGO_FOTO = 2700000; // caracteres en base64: el bucket admite hasta 2 MB por foto
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NOMBRE_FOTO = /^[1-6]\.jpg$/;

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    let datos = req.body;
    if (typeof datos === 'string') {
        try { datos = JSON.parse(datos); } catch (e) { datos = {}; }
    }
    const { action, projectId, token, nombre, indice, foto } = datos || {};
    if (!token) return res.status(401).json({ error: 'No hay sesión' });
    if (token.length > 7000) return res.status(413).json({ error: 'La sesión pesa demasiado' });
    // El id va dentro de la ruta del archivo: solo se acepta con forma de id.
    if (!projectId || !UUID.test(projectId)) return res.status(400).json({ error: 'Id de proyecto no válido' });

    const cabeceras = { apikey: SUPA_KEY, Authorization: `Bearer ${token}` };

    try {
        const usuarioRes = await fetch(`${SUPA_URL}/auth/v1/user`, { headers: cabeceras });
        if (!usuarioRes.ok) return res.status(401).json({ error: 'Sesión no válida' });
        const usuario = await usuarioRes.json();
        if (!usuario || !usuario.id) return res.status(401).json({ error: 'Sesión no válida' });
        const carpeta = `${usuario.id}/${projectId}`;

        if (action === 'list') {
            return res.status(200).json({ fotos: await listar(cabeceras, carpeta) });
        }

        if (action === 'get') {
            if (!NOMBRE_FOTO.test(String(nombre))) return res.status(400).json({ error: 'Nombre de foto no válido' });
            const r = await fetch(`${SUPA_URL}/storage/v1/object/authenticated/${BUCKET}/${carpeta}/${nombre}`, { headers: cabeceras });
            if (!r.ok) return res.status(r.status).json({ error: 'No se pudo leer la foto' });
            const bytes = Buffer.from(await r.arrayBuffer());
            res.setHeader('Content-Type', 'image/jpeg');
            res.setHeader('Cache-Control', 'private, no-store');
            return res.status(200).send(bytes);
        }

        if (action === 'upload') {
            const n = Number(indice);
            if (!Number.isInteger(n) || n < 1 || n > MAX_FOTOS) return res.status(400).json({ error: 'Número de foto no válido' });
            if (typeof foto !== 'string' || foto.length > MAX_LARGO_FOTO || !/^\/9j\/[A-Za-z0-9+/]+=*$/.test(foto)) {
                return res.status(400).json({ error: 'La foto debe ser un JPG' });
            }
            // Solo se guardan fotos de proyectos que existen y son de esta cuenta.
            const filaRes = await fetch(`${SUPA_URL}/rest/v1/projects?id=eq.${projectId}&select=id`, { headers: cabeceras });
            const filas = filaRes.ok ? await filaRes.json() : [];
            if (!Array.isArray(filas) || !filas.length) return res.status(404).json({ error: 'Proyecto no encontrado' });

            // x-upsert: si el cotizador reintenta tras un corte de red y la foto ya
            // alcanzó a guardarse, se reemplaza en vez de fallar con "ya existe".
            const r = await fetch(`${SUPA_URL}/storage/v1/object/${BUCKET}/${carpeta}/${n}.jpg`, {
                method: 'POST',
                headers: { ...cabeceras, 'Content-Type': 'image/jpeg', 'x-upsert': 'true' },
                body: Buffer.from(foto, 'base64')
            });
            if (!r.ok) return res.status(r.status).json({ error: 'No se pudo guardar la foto', detalle: await r.text() });
            return res.status(200).json({ guardada: `${n}.jpg` });
        }

        if (action === 'clear') {
            const nombres = await listar(cabeceras, carpeta);
            if (!nombres.length) return res.status(200).json({ borradas: 0 });
            const r = await fetch(`${SUPA_URL}/storage/v1/object/${BUCKET}`, {
                method: 'DELETE',
                headers: { ...cabeceras, 'Content-Type': 'application/json' },
                body: JSON.stringify({ prefixes: nombres.map(f => `${carpeta}/${f}`) })
            });
            if (!r.ok) return res.status(r.status).json({ error: 'No se pudieron borrar las fotos', detalle: await r.text() });
            return res.status(200).json({ borradas: nombres.length });
        }

        return res.status(400).json({ error: 'Acción no válida' });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}

// Nombres de las fotos del proyecto (1.jpg, 2.jpg...), en orden.
async function listar(cabeceras, carpeta) {
    const r = await fetch(`${SUPA_URL}/storage/v1/object/list/${BUCKET}`, {
        method: 'POST',
        headers: { ...cabeceras, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefix: carpeta, limit: 100, offset: 0, sortBy: { column: 'name', order: 'asc' } })
    });
    if (!r.ok) throw new Error('No se pudieron listar las fotos');
    const lista = await r.json();
    return (Array.isArray(lista) ? lista : [])
        .map(o => o && o.name)
        .filter(n => NOMBRE_FOTO.test(String(n)))
        .sort();
}
