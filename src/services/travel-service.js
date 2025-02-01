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

export async function getActualTravelPeople() {
    const currentTravel = await getCurrentTravel();
    if (currentTravel.length === 0) {
        throw new Error('No se encontró un viaje actual.');
    }

    const travel = currentTravel[0];
    const people = travel.properties.Personas?.multi_select || [];
    const peopleList = people.map((person) => person.name);

    return peopleList;
}
