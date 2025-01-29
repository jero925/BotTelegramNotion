import { Client } from '@notionhq/client';
import opcionesDB from '../config/databases.js';
import { opcionesMovimientoTipoIO } from '../config/movements.js';
import { queryDatabase, retrieveDatabase } from '../utils/notion_database.js'

const notion = new Client({ auth: opcionesDB.apiKeyNotion });

// Obtiene el mes actual desde Notion
export async function getCurrentMonth() {
    const response = await queryDatabase(dbOptions.dbMeses, {
        and: [{ property: "Actual", checkbox: { equals: true } }]
    });
    return response.results[0].id;
}

export async function getPaymentAccounts() {
    return await getAccounts({ property: "Tipo", select: { equals: "Cuenta" } });
}

export async function getCreditCardList() {
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

export async function getIncomeExpenseType(databaseId) {
    try {
        const response = await retrieveDatabase(databaseId);
        const incomeExpenseTypeCollection = response.properties.Tipo.multi_select.options.map((result, index) => ({
            typeIndex: index + 1,
            typeId: result.id,
            typeName: result.name
        }));
        const typeList = incomeExpenseTypeCollection.map((type) => `${type.typeIndex}- ${type.typeName}`).join('\n');
        return { typeList, incomeExpenseTypeCollection };
    } catch (error) {
        console.error("Error al obtener movimiento tipo Notion:", error.message);
        return { typeList: 'No hay tipos disponibles', incomeExpenseTypeCollection: [] };
    }
}

export async function getCurrentTravel() {
    const response = await queryDatabase(dbOptions.dbViaje, {
        property: "Actual", checkbox: { equals: true }
    });
    return response.results;
}

export async function addNewRecord(ctx, paymentData) {
    ctx.reply('Agregando registro nuevo...');
    try {
        await createNewMovement(paymentData);
        ctx.reply('Registro insertado correctamente.');
    } catch (error) {
        console.error('Error al insertar el registro:', error.message);
        ctx.reply('Ocurrió un error al insertar el registro.');
    }
}

export async function createNewMovement(properties) {
    const pageFactory = new NotionPageFactory(dbOptions.dbFlujoPlata)
        .setIcon(properties.movimientoImagen)
        .setTitle('Nombre', properties.movimientoNombre)
        .setDate('Fecha', properties.movimientoFechaActual)
        .setRelation('Producto en cuotas', properties.movimientoCuotaId)
        .setRelation('Cuenta', properties.movimientoCuentaId)
        .setMultiSelect('Tipo', properties.movimientoTipoNombre)
        .setSelect('I/O', properties.movimientoTipoIO)
        .setStatus('Estado Suscripcion', 'No sub')
        .setRelation('Ingreso. Mes Año', properties.movimientoTipoIO === opcionesMovimientoTipoIO.Ingreso ? properties.movimientoMesActualId : null)
        .setNumber('Monto', properties.movimientoTipoIO === opcionesMovimientoTipoIO.Gasto ? -properties.movimientoMonto : properties.movimientoMonto)
        .setRelation('Gasto. Mes Año', properties.movimientoTipoIO === opcionesMovimientoTipoIO.Gasto ? properties.movimientoMesActualId : null);

    await pageFactory.create();
}

export async function createNewInstallmentPage(properties) {
    const pageFactory = new NotionPageFactory(dbOptions.dbFlujoPlata)
        .setIcon(properties.cuotaImagen)
        .setTitle('Nombre', properties.cuotaNombre)
        .setNumber('Monto Total', properties.cuotaMonto)
        .setSelect('Cantidad de cuotas', properties.cuotaCantidadCuotas)
        .setDate("Primer cuota", properties.cuotaFechaPrimerCuota)
        .setDate("Fecha de compra", properties.cuotaFechaActual)
        .setRelation('Meses', properties.cuotaMeses);

    await pageFactory.create();
}

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

export async function getMonthsInDateRange(databaseId, startDate, endDate) {
    const response = await queryDatabase(databaseId, {
        and: [
            { property: "Date", date: { on_or_after: startDate } },
            { property: "Date", date: { on_or_before: endDate } }
        ]
    });
    return response.results.map(result => ({ id: result.id }));
}

export async function createTravelExpense(properties) {
    const pageFactory = new NotionPageFactory(dbOptions.dbGastosViaje)
        .setTitle('Nombre', properties.name)
        .setMultiSelect('Tipo', properties.type)
        .setSelect('Pagador', properties.payer)
        .setNumber('Monto', properties.amount)
        .setRelation('Viaje', properties.travelId);

    await pageFactory.create();
}