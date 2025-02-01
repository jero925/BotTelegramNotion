import { queryDatabase } from './notion-service.js';
import dbOptions from '../config/databases.js';

export async function getPaymentAccounts() {
    return await getAccounts({ property: "Tipo", select: { equals: "Cuenta" } });
}

export async function getCreditCardList() {
    return await getAccounts({ property: "Tipo", select: { equals: "Tarjeta" } });
}

export async function getActiveCreditCardList() {
    const filters = {
        and: [
            { property: "Tipo", select: { equals: "Tarjeta" } },
            { property: "Active", checkbox: { equals: true } }
        ]
    };
    return await getAccounts(filters);
}

async function getAccounts(filters) {
    const accounts = await queryDatabase(dbOptions.dbMetPago, filters);
    const accountsData = accounts.results.map((result, index) => ({
        accountIndex: index + 1,
        accountId: result.id,
        accountName: result.properties.Name.title[0].text.content
    }));
    const accountsList = accountsData.map((account) => `${account.accountIndex}- ${account.accountName}`).join('\n');
    return { accountsList, accountsData };
}