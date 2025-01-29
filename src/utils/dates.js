// Función para obtener la fecha actual en formato Notion
export function getTodayDate() {
    return new Date().toISOString()
}

export function ObtenerPrimerDiaMesSiguiente(fechaString, cantidadMeses) {
    // Convertir la cadena de texto a un objeto Date
    const fecha = new Date(fechaString);

    // Calcular el mes siguiente
    const mesSiguiente = fecha.getMonth() + 1 + cantidadMeses;
    const añoSiguiente = fecha.getFullYear() + Math.floor(mesSiguiente / 12); // Calcular si hay cambio de año
    const mesSiguienteNormalizado = mesSiguiente % 12 || 12; // Normalizar el mes para que esté en el rango [1, 12]
    const primerDiaMesSiguiente = new Date(añoSiguiente, mesSiguienteNormalizado - 1, 1); // Obtener el primer día del mes siguiente

    // Formatear la fecha en el formato YYYY-MM-DD
    const fechaPrimerDiaMesSiguiente = `${primerDiaMesSiguiente.getFullYear()}-${(primerDiaMesSiguiente.getMonth() + 1).toString().padStart(2, '0')}-${primerDiaMesSiguiente.getDate().toString().padStart(2, '0')}`;

    return fechaPrimerDiaMesSiguiente;
}