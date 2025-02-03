// Función para obtener la fecha actual en formato Notion
export function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

export function getFirstDayOfNextMonth(dateString, monthsToAdd) {
    const date = new Date(dateString);

    const nextMonth = date.getMonth() + 1 + monthsToAdd;
    const nextYear = date.getFullYear() + Math.floor(nextMonth / 12); // Handle year overflow
    const normalizedMonth = nextMonth % 12 || 12; // Normalize month to be within [1, 12]
    const firstDayOfNextMonth = new Date(nextYear, normalizedMonth - 1, 1); // Get the first day of the next month

    return firstDayOfNextMonth.toISOString().split('T')[0];
}