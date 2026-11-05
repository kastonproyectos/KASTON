// Precios de venta por m², en pesos colombianos.
//
// Una sola fuente para los dos lados: el cotizador (en el navegador) y el correo
// de la cotización (api/send-quote.js), que recalcula el precio con estos mismos
// valores en vez de creerle al navegador. Si cambia un precio, se cambia solo aquí.
//
// ESTE ARCHIVO ES PÚBLICO (se ve en el sitio y en GitHub): aquí van solo precios
// de venta. Los costos, márgenes y la tarifa del instalador viven en el doc
// "Costos y precios KASTON", nunca en el código.
globalThis.KASTON_PRECIOS = {
    // Solo teja: precio único, no depende de la ubicación.
    soloTejaM2: 85000,

    // Todo costo: depende de la distancia de la obra a la planta.
    // Se evalúan en orden: gana la primera zona cuyo maxKm alcance.
    zonasTodoCosto: [
        { id: 'metro', maxKm: 25, precioM2: 153000 },
        { id: 'afueras', maxKm: 60, precioM2: 165500 },
        { id: 'lejana', maxKm: Infinity, precioM2: null } // sin precio automático: pasa a un asesor
    ]
};
