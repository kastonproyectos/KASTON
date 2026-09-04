// Proxy de proyectos en el mismo origen que la web.
//
// Safari corta las llamadas del navegador directo a supabase.co: fallan con
// "TypeError: Load failed" antes de salir. Ya habia pasado con el guardado y
// por eso existe save-project.js; borrar, editar y listar chocaban con lo mismo.
// Aqui la peticion sale del servidor, no del navegador, y no hay nada que cortar.
//
// El token del cliente viaja tal cual a Supabase, asi que las reglas por fila
// siguen mandando: nadie puede tocar los proyectos de otro por pasar por aqui.
const SUPA_URL = 'https://naxvanbiwgwfraxqtsof.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5heHZhbmJpd2d3ZnJheHF0c29mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxODUxNDQsImV4cCI6MjA5MTc2MTE0NH0.jMoSNrVwKHBuPxTDxsqsysuV0I7c0t6DNk-7bFbTwvw';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    // El cliente manda el token dentro del cuerpo, no en la cabecera: asi la
    // peticion es "simple" para el navegador y sobrevive la redireccion a www,
    // que Safari no perdona cuando hay cabecera de autorizacion. Se acepta
    // igual por cabecera para no romper a quien tenga la version anterior.
    let datos = req.body;
    if (typeof datos === 'string') {
        try { datos = JSON.parse(datos); } catch (e) { datos = {}; }
    }
    const { action, id, fields, token } = datos || {};

    const authHeader = token ? `Bearer ${token}` : req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'No authorization header' });
    const base = `${SUPA_URL}/rest/v1/projects`;

    let url, method, body;
    if (action === 'list') {
        // Sin filtro de user_id: las reglas por fila ya limitan a los del dueño del token.
        url = `${base}?select=*&order=created_at.desc`;
        method = 'GET';
    } else if (action === 'delete') {
        if (!id) return res.status(400).json({ error: 'Falta el id del proyecto' });
        url = `${base}?id=eq.${encodeURIComponent(id)}`;
        method = 'DELETE';
    } else if (action === 'update') {
        if (!id) return res.status(400).json({ error: 'Falta el id del proyecto' });
        if (!fields || typeof fields !== 'object') return res.status(400).json({ error: 'Faltan los campos a actualizar' });
        url = `${base}?id=eq.${encodeURIComponent(id)}`;
        method = 'PATCH';
        body = JSON.stringify(fields);
    } else if (action === 'clear-avatar') {
        // Saca la foto en base64 de los metadatos del usuario. Ahi dentro viaja
        // en el token de sesion y lo engorda hasta que Cloudflare rechaza las
        // peticiones que lo llevan. Va por aqui y no desde el navegador porque
        // el token grande solo sobrevive dentro del cuerpo del mensaje.
        url = `${SUPA_URL}/auth/v1/user`;
        method = 'PUT';
        body = JSON.stringify({ data: { avatar_url: null } });
    } else {
        return res.status(400).json({ error: 'Accion no valida' });
    }

    try {
        const supaRes = await fetch(url, {
            method,
            headers: {
                'apikey': SUPA_KEY,
                'Authorization': authHeader,
                'Content-Type': 'application/json',
                // representation en todas: el cliente necesita saber si el borrado
                // o la edicion tocaron alguna fila, no solo que no hubo error.
                'Prefer': 'return=representation'
            },
            ...(body ? { body } : {})
        });

        const text = await supaRes.text();
        res.setHeader('Content-Type', 'application/json');
        return res.status(supaRes.status).send(text || '[]');
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}
