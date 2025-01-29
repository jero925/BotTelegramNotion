import { queryDatabase, retrieveDatabase } from './notion-service.js';
import dbOptions from '../config/databases.js';

export async function getCurrentTravel() {
    const response = await queryDatabase(dbOptions.dbViaje, {
        property: "Actual", checkbox: { equals: true }
    });
    return response.results;
}

export async function getTravelExpenseTypes() {
    const { properties } = await retrieveDatabase(dbOptions.dbGastosViaje);
    const expenseTypeCollection = properties.Tipo.multi_select.options.map((type, index) => ({
        index: index + 1,
        id: type.id,
        name: type.name
    }));
    const expenseTypeList = expenseTypeCollection.map((type) => `${type.index}- ${type.name}`).join('\n');
    return { expenseTypeList, expenseTypeCollection };
}

export async function getActiveTravels() {
    const response = await queryDatabase(dbOptions.dbViaje, {
        property: "Active", checkbox: { equals: true }
    });
    return response.results;
}