// Despertador diario de la base del cotizador.
//
// El plan gratis de Supabase pausa el proyecto tras 7 dias sin actividad, y con
// la pausa se cae todo el inicio de sesion (paso en septiembre y en octubre de
// 2026). Vercel llama esta funcion una vez al dia (ver "crons" en vercel.json)
// y la consulta cuenta como actividad, asi que la semana nunca llega a cumplirse.
//
// Solo lee con la clave anon: las reglas por fila devuelven una lista vacia, pero
// la consulta igual pasa por la base, que es lo que importa.
const SUPA_URL = 'https://naxvanbiwgwfraxqtsof.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5heHZhbmJpd2d3ZnJheHF0c29mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxODUxNDQsImV4cCI6MjA5MTc2MTE0NH0.jMoSNrVwKHBuPxTDxsqsysuV0I7c0t6DNk-7bFbTwvw';

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    try {
        const r = await fetch(`${SUPA_URL}/rest/v1/projects?select=id&limit=1`, {
            headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` }
        });
        // Si ya estaba pausada, esto falla y queda en los registros de Vercel con el codigo.
        if (!r.ok) return res.status(502).json({ ok: false, supabase: r.status });
        return res.status(200).json({ ok: true });
    } catch (e) {
        return res.status(502).json({ ok: false, error: String(e) });
    }
}
