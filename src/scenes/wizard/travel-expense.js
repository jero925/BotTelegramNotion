import { BaseWizard } from '../../class/base-wizard.js';
import { createTravelExpense } from '../../services/travel-expense-service.js';
import { getCurrentTravel, getTravelExpenseTypes, getActualTravelPeople } from '../../services/travel-service.js';
import CustomKeyboard from '../../class/keyboard.js';

class TravelExpenseWizard extends BaseWizard {
    constructor() {
        const stepDefinitions = [
            { name: 'EXPENSE_NAME', handler: 'askForExpenseName' },
            { name: 'AMOUNT', handler: 'saveExpenseNameAndAskForAmount' },
            { name: 'PAYER', handler: 'saveAmountAndAskForPayer' },
            { name: 'EXPENSE_TYPE', handler: 'savePayerAndAskForExpenseType' },
            { name: 'CREATE_EXPENSE', handler: 'saveExpenseTypeAndCreateExpense' }
        ];
        const steps = TravelExpenseWizard.buildSteps(stepDefinitions);
        super('CREATE_TRAVEL_EXPENSE', steps);
    }

    async askForExpenseName(ctx) {
        await ctx.reply('Nombre del gasto');
        return ctx.wizard.next();
    }

    async saveExpenseNameAndAskForAmount(ctx) {
        const expenseName = ctx.message.text;

        if (!expenseName) {
            await ctx.reply('El nombre no puede estar vacío. Por favor, ingresa el nombre del gasto.');
            return ctx.scene.reset();
        }

        ctx.wizard.state.expenseName = expenseName;
        await ctx.reply('Monto');
        return ctx.wizard.next();
    }

    async saveAmountAndAskForPayer(ctx) {
        const amount = parseFloat(ctx.message.text);

        if (isNaN(amount) || amount <= 0) {
            await ctx.reply('Por favor, ingresa un monto válido.');
            return;
        }
        ctx.wizard.state.expenseAmount = amount;

        const people = await getActualTravelPeople();
        const inlineKeyboard = CustomKeyboard.generateKeyboardFromOptions(people, 2);
        await ctx.reply('¿Quién paga?', inlineKeyboard);

        return ctx.wizard.next();
    }

    async savePayerAndAskForExpenseType(ctx) {
        const payer = ctx.message.text;

        if (!payer) {
            await ctx.reply('El pagador no puede estar vacío. Por favor, ingresa el nombre del pagador.');
            return;
        }

        ctx.wizard.state.expensePayer = payer;

        const currentTravel = await getCurrentTravel();
        if (!currentTravel || currentTravel.length === 0) {
            await ctx.reply('No se encontró un viaje activo. Intenta nuevamente más tarde.');
            return ctx.scene.leave();
        }

        ctx.wizard.state.travelId = currentTravel[0].id;

        const { expenseTypeList, expenseTypeCollection } = await getTravelExpenseTypes();
        ctx.wizard.state.expenseTypes = expenseTypeCollection;

        await ctx.reply(`Tipo de Gasto:\n${expenseTypeList}`);
        return ctx.wizard.next();
    }

    async saveExpenseTypeAndCreateExpense(ctx) {
        const expenseTypeIndex = parseInt(ctx.message.text, 10) - 1;
        const expenseTypes = ctx.wizard.state.expenseTypes;

        if (isNaN(expenseTypeIndex) || expenseTypeIndex < 0 || expenseTypeIndex >= expenseTypes.length) {
            await ctx.reply('Índice de tipo de gasto inválido. Por favor, elige un tipo válido.');
            return;
        }

        ctx.wizard.state.expenseType = expenseTypes[expenseTypeIndex]?.name;

        const expenseData = {
            name: ctx.wizard.state.expenseName,
            type: ctx.wizard.state.expenseType,
            amount: ctx.wizard.state.expenseAmount,
            payer: ctx.wizard.state.expensePayer,
            travelId: ctx.wizard.state.travelId
        };

        await createTravelExpense(expenseData);
        await ctx.reply('Gasto de viaje agregado exitosamente.');

        return ctx.scene.leave();
    }
}

const TRAVEL_EXPENSE_WIZARD = new TravelExpenseWizard().scene;

export default TRAVEL_EXPENSE_WIZARD;