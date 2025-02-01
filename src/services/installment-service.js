import { NotionPageFactory } from '../class/notion-page-factory.js';
import dbOptions from '../config/databases.js';
import { queryDatabase } from './notion-service.js';

export async function createNewInstallment(properties) {
    const pageFactory = new NotionPageFactory(dbOptions.dbCuotas);

    pageFactory
        .setIcon(properties.installmentImage)
        .setTitle('Nombre', properties.productName)
        .setDate('Fecha de compra', properties.todayDate)
        .setNumber('Monto Total', properties.amount)
        .setSelect('Cantidad de cuotas', properties.installmentCount)
        .setDate('Primer cuota', properties.firstInstallmentDate)
        .setRelation('Meses', properties.months)

        // .setRelation('Cuenta', properties.movimientoCuentaId)
        // .setMultiSelect('Tipo', properties.movimientoTipoNombre)
        // .setStatus('Estado Suscripcion', 'No sub')
        // .setRelation('Ingreso. Mes Año', properties.movimientoTipoIO === movementTypeIOOptions.Ingreso ? properties.movimientoMesActualId : null)
        // .setNumber('Monto', properties.movimientoTipoIO === movementTypeIOOptions.Gasto ? -properties.movimientoMonto : properties.movimientoMonto)
        // .setRelation('Gasto. Mes Año', properties.movimientoTipoIO === movementTypeIOOptions.Gasto ? properties.movimientoMesActualId : null)

    const pageProperties = pageFactory.build();

    await pageFactory.create(pageProperties.content);   
}

export async function getActiveInstallmentsByCard(accountId) {
    const filter = { property: "Tarjeta", relation: { contains: accountId } };
    return await getActiveInstallments(filter);
}

export async function getActiveInstallments(filter) {
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