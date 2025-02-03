import { queryDatabase } from './notion-service.js';
import dbOptions from '../config/databases.js';

export async function getCurrentMonth() {
    const response = await queryDatabase(dbOptions.dbMeses, {
        and: [{ property: "Actual", checkbox: { equals: true } }]
    });
    return response.results[0].id;
}

export async function getPreviousMonth() {
    const currentMonth = await getCurrentMonth()
    const previousMonth = await queryDatabase(dbOptions.dbMeses, {
        property: "Date",
        date: { before: currentMonth.results[0].properties.Date.date.start }
    });
    return previousMonth.results[0];
}

export async function getMonthsInDateRange(startDate, endDate) {
    const response = await queryDatabase(dbOptions.dbMeses, {
        and: [
            { property: "Date", date: { on_or_after: startDate } },
            { property: "Date", date: { on_or_before: endDate } }
        ]
    });
    return response.results.map(result => ({ id: result.id }));
}