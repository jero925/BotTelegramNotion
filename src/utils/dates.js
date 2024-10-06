// Función para obtener la fecha actual en formato Notion
function ObtenerFechaHoy() {
    const fechaActual = new Date();

    // Obtiene componentes de la fecha
    fechaNotion = formatDate(fechaActual)
    return fechaNotion
}

function formatDate(fechaString) {
    const fecha = new Date(fechaString)
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');  // Meses son 0-indexados, por lo que se suma 1
    const day = String(fecha.getDate()).padStart(2, '0');

    // Formatea la fecha para Notion (Año - Mes - Día)
    const fechaFormateada = `${year}-${month}-${day}`;

    return fechaFormateada;
}

module.exports = { ObtenerFechaHoy }