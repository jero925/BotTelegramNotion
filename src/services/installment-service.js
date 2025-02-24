import { getTodayDate, getFirstDayOfNextMonth } from '../utils/dates.js';
import { NotionPageFactory } from '../class/notion-page-factory.js';
import dbOptions from '../config/databases.js';
import { queryDatabase } from './notion-service.js';

export async function createNewInstallment(properties) {

    const pageFactory = new NotionPageFactory(dbOptions.dbCuotas);

    pageFactory
        .setIcon(properties.installmentImage)
        .setTitle('Name', properties.productName)
        .setDate('Fecha de compra', properties.todayDate)
        .setNumber('Monto Total', properties.amount)
        .setSelect('Cantidad de cuotas', properties.installmentCount)
        .setDate('Primer cuota', properties.firstInstallmentDate)
        .setRelation('Meses', properties.months)
        .setRelation('Tarjeta', properties.cardId);

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

    const order = [
        { property: "Fecha de compra", direction: "ascending" }
    ]

    const activeInstallments = await queryDatabase(dbOptions.dbCuotas, { and: filters }, order);

    let activeInstallmentsCollection = [];

    const initialInstallment = {
        installmentIndex: 0,
        installmentName: 'Nueva Cuota'
    };
    activeInstallmentsCollection.push(initialInstallment);

    const newInstallments = activeInstallments.results.map((result, index) => ({
        installmentIndex: index + 1,
        installmentId: result.id,
        installmentName: result.properties.Name.title[0].text.content,
        installmentAmount: result.properties['Valor Cuota num'].formula.number,
        paidInstallments: result.properties['Cuotas pagadas'].rollup.number,
        paidInstallmentsCount: result.properties['Count Cuotas Pagadas'].formula.string,
        purchaseDate: result.properties['Fecha de compra'].date.start // Extraer la fecha de compra
    }));

    activeInstallmentsCollection = activeInstallmentsCollection.concat(newInstallments);

    const activeInstallmentsList = activeInstallmentsCollection.map((installment) => {
        let installmentText = `${installment.installmentIndex} - ${installment.installmentName}`;
        if (installment.installmentAmount !== undefined) {
            installmentText += ` - $${installment.installmentAmount}`;
        }
        if (installment.paidInstallmentsCount !== undefined) {
            installmentText += ` - ${installment.paidInstallmentsCount}`;
        }
        return installmentText;
    }).join('\n');

    return { activeInstallmentsList, activeInstallmentsCollection };
}

export async function getNextMonthTotal() {
    const today = getTodayDate()
    let nextMonthFirst = getFirstDayOfNextMonth(today, 1)

    const filters = [
        { "property": "Activa", "checkbox": { "equals": true } },
        { "property": "Fecha ultima Cuota", "date": { "on_or_after": nextMonthFirst } }
    ];

    const installments = await queryDatabase(dbOptions.dbCuotas, { and: filters });

    if (!installments || !installments.results || installments.results.length === 0) {
        console.log("No active installments found.");
        return;
    }

    let totalSum = 0;    

    installments.results.forEach((result) => {
        const installmentValue = result.properties["Valor Cuota num"].formula["number"];

        if (typeof installmentValue === "number" && !isNaN(installmentValue)) {
            totalSum += installmentValue;
        } else {
            console.warn(`Invalid installment value for item with ID: ${result.id}`);
        }
    });

    return totalSum
}