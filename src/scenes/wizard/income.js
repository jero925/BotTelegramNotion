import { BaseWizard } from '../../class/base-wizard.js';
import dbOptions from '../../config/databases.js';
import { MOVEMENT_TYPES, MOVEMENT_IMAGES } from '../../config/movements.js';
import { retrieveDatabase } from '../../services/notion-service.js';
import { getCurrentMonth } from '../../services/month-service.js';
import { getPaymentAccounts } from '../../services/account-service.js';
import { createNewMovement } from '../../services/movement-service.js';
import { getTodayDate } from '../../utils/dates.js';

const STEPS = {
    INCOME_NAME: {
        step: 0,
        handler: 'askForIncomeName'
    },
    AMOUNT: {
        step: 1,
        handler: 'saveIncomeNameAndAskForAmount'
    },
    MOVEMENT_TYPE: {
        step: 2,
        handler: 'saveAmountAndAskForMovementType'
    },
    ACCOUNT: {
        step: 3,
        handler: 'saveMovementTypeAndAskForAccount'
    },
    REGISTER_INCOME: {
        step: 4,
        handler: 'saveAccountAndRegisterIncome'
    }
};

class IncomeWizard extends BaseWizard {
    constructor() {
        const stepDefinitions = [
            { name: 'INCOME_NAME', handler: 'askForIncomeName' },
            { name: 'AMOUNT', handler: 'saveIncomeNameAndAskForAmount' },
            { name: 'MOVEMENT_TYPE', handler: 'saveAmountAndAskForMovementType' },
            { name: 'ACCOUNT', handler: 'saveMovementTypeAndAskForAccount' },
            { name: 'REGISTER_INCOME', handler: 'saveAccountAndRegisterIncome' }
        ];
        const steps = IncomeWizard.buildSteps(stepDefinitions);
        super('CREATE_NEW_INCOME', STEPS);
    }

    async askForIncomeName(ctx) {
        await ctx.reply('Nombre del ingreso');
        return ctx.wizard.next();
    }

    async saveIncomeNameAndAskForAmount(ctx) {
        const incomeName = ctx.message.text;

        if (!incomeName) {
            await ctx.reply('El nombre no puede estar vacío. Por favor, ingresa el nombre del ingreso.');
            return ctx.scene.reset();
        }

        ctx.wizard.state.incomeName = incomeName;
        await ctx.reply('Monto');
        return ctx.wizard.next();
    }

    async saveAmountAndAskForMovementType(ctx) {
        const amount = parseFloat(ctx.message.text);

        if (isNaN(amount) || amount <= 0) {
            await ctx.reply('Por favor, ingresa un monto válido.');
            return;
        }

        ctx.wizard.state.incomeAmount = amount;
        const movementTypes = await this.getMovementTypes();
        if (!movementTypes || movementTypes.length === 0) {
            await ctx.reply('No se encontraron tipos de movimiento. Intenta nuevamente más tarde.');
            return ctx.scene.leave();
        }

        ctx.wizard.state.movementTypes = movementTypes;

        await ctx.reply(`Índice del Tipo de Movimiento:\n${this.formatMovementTypes(movementTypes)}`);
        return ctx.wizard.next();
    }

    async saveMovementTypeAndAskForAccount(ctx) {
        const movementTypeIndex = parseInt(ctx.message.text) - 1;  // Ajustar índice de 1 a 0
        const movementTypes = ctx.wizard.state.movementTypes;

        if (isNaN(movementTypeIndex) || movementTypeIndex < 0) {
            await ctx.reply('Índice de tipo de movimiento inválido. Por favor, elige un tipo válido.');
            return;
        }

        ctx.wizard.state.movementTypeName = movementTypes[movementTypeIndex]?.name;

        const paymentAccounts = await getPaymentAccounts();

        if (!paymentAccounts || !paymentAccounts.accountsData || paymentAccounts.accountsData.length === 0) {
            await ctx.reply('No se encontraron cuentas. Intenta nuevamente más tarde.');
            return ctx.scene.leave();
        }

        ctx.wizard.state.paymentAccounts = paymentAccounts.accountsData;

        await ctx.reply(`Cuentas:\n${paymentAccounts.accountsList}`);
        await ctx.reply('¿Dónde entra la plata?');

        return ctx.wizard.next();
    }

    async saveAccountAndRegisterIncome(ctx) {
        const accountIndex = parseInt(ctx.message.text) - 1;  // Ajustar índice de 1 a 0
        const paymentAccounts = ctx.wizard.state.paymentAccounts;

        if (isNaN(accountIndex) || accountIndex < 0 || accountIndex >= paymentAccounts.length) {
            await ctx.reply('Índice de cuenta inválido. Por favor, elige una cuenta válida.');
            return;
        }

        ctx.wizard.state.accountId = paymentAccounts[accountIndex]?.accountId;

        const incomeData = {
            movimientoNombre: ctx.wizard.state.incomeName,
            movimientoMonto: ctx.wizard.state.incomeAmount,
            movimientoTipoNombre: [ctx.wizard.state.movementTypeName],
            movimientoCuentaId: ctx.wizard.state.accountId,
            movimientoFechaActual: await getTodayDate(),
            movimientoMesActualId: await getCurrentMonth(),
            movimientoTipoIO: MOVEMENT_TYPES.Ingreso,
            movimientoImagen: MOVEMENT_IMAGES.Ingreso
        };

        await createNewMovement(incomeData);
        await ctx.reply('Ingreso registrado exitosamente.');

        return ctx.scene.leave();
    }

    async getMovementTypes() {
        const databaseId = dbOptions.dbFlujoPlata;
        const response = await retrieveDatabase(databaseId, {});
        return response.properties.Tipo.multi_select.options.map((result, index) => ({
            index: index + 1,
            id: result.id,
            name: result.name
        }));
    }

    formatMovementTypes(movementTypes) {
        return movementTypes.map((type) => `${type.index} - ${type.name}`).join('\n');
    }
}

const INCOME_WIZARD = new IncomeWizard().scene;

export default INCOME_WIZARD;