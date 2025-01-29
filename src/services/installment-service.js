import { queryDatabase } from './notion-service.js';
import dbOptions from '../config/databases.js';

export async function getActivePaymentsByCard(accountId) {
    const filter = { property: "Tarjeta", relation: { contains: accountId } };
    return await getActivePayments(filter);
}

export async function getActivePayments(filter) {
    const today = new Date().toISOString();
    const filters = [
        { property: "Activa", checkbox: { equals: true } },
        { property: "Pagada Mes Actual", checkbox: { equals: false } },
        { property: "Primer cuota", date: { before: today } }
    ];

    if (filter) filters.push(filter);

    const activeInstallments = await queryDatabase(dbOptions.dbCuotas, { and: filters });
    const activeInstallmentsCollection = activeInstallments.results.map((result, index) => ({
        installmentIndex: index + 1,
        installmentId: result.id,
        installmentName: result.properties.Name.title[0].text.content,
        installmentAmount: result.properties['Valor Cuota num'].formula.number,
        paidInstallments: result.properties['Cuotas pagadas'].rollup.number,
        paidInstallmentsCount: result.properties['Count Cuotas Pagadas'].formula.string
    }));

    const activeInstallmentsList = activeInstallmentsCollection.map((installment) => 
        `${installment.installmentIndex} - ${installment.installmentName} ${installment.installmentAmount !== undefined ? `- $${installment.installmentAmount}` : ''} ${installment.paidInstallmentsCount !== undefined ? `- ${installment.paidInstallmentsCount}` : ''}`
    ).join('\n');

    return { activeInstallmentsList, activeInstallmentsCollection };
}