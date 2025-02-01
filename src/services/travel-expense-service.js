import { NotionPageFactory } from '../class/notion-page-factory.js';
import dbOptions from '../config/databases.js';

export async function createTravelExpense(properties) {

    const pageFactory = new NotionPageFactory(dbOptions.dbGastosViaje)
        .setTitle('Nombre', properties.name)
        .setMultiSelect('Tipo', properties.type)
        .setSelect('Pagador', properties.payer)
        .setNumber('Monto', properties.amount)
        .setRelation('Viaje', properties.travelId);

    const pageProperties = pageFactory.build();

    await pageFactory.create(pageProperties.content);
}

export async function updateTravelExpense(expenseId, properties) {
    const pageFactory = new NotionPageFactory(dbOptions.dbGastosViaje)
        .setTitle('Nombre', properties.name)
        .setMultiSelect('Tipo', properties.type)
        .setSelect('Pagador', properties.payer)
        .setNumber('Monto', properties.amount)
        .setRelation('Viaje', properties.travelId);

    await pageFactory.update(expenseId);
}