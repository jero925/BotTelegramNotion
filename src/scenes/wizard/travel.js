import { Scenes } from 'telegraf';

import { 
    getActualTravel, 
    getTravelExpenseType, 
    AddNewTravelExpense 
} from '../../notion/notion_functions.js';


const TRAVEL_EXPENSE_WIZARD = new Scenes.WizardScene(
    'CREATE_TRAVEL_EXPENSE',
    // 0
    async (ctx) => {
        ctx.reply('Nombre del gasto')
        return ctx.wizard.next();
    },

    // 1 - Guarda el Nombre, escribe Monto (PARA COMPARTIR CON INGRESO Y GASTO)
    async (ctx) => {
        ctx.wizard.state.travelExpenseName = ctx.message.text
        await ctx.reply(`Monto`)

        return ctx.wizard.next()
    },

    // 2 - Guarda monto, escribe Pagador
    async (ctx) => {
        ctx.wizard.state.travelExpenseAmount = parseFloat(ctx.message.text)

        await ctx.reply(`Quien paga?`)

        return ctx.wizard.next()
    },

    // 3 Guarda Pagador, Pregunta tipo, crea
    async (ctx) => {
        ctx.wizard.state.actualTravelData = await getActualTravel()
        ctx.wizard.state.travelExpensePayer = ctx.message.text;

        const { expenseTypeList, expenseTypeCollection } = await getTravelExpenseType();
        ctx.wizard.state.travelExpensesCollection = expenseTypeCollection
        await ctx.reply(`Tipo de Gasto:\n${expenseTypeList}`);
        return ctx.wizard.next();
    },

    // 4 - FINAL - Guarda Tipo - Crea REGISTRO
    async (ctx) => {
        // ctx.wizard.state.travelExpenseType = 
        ctx.wizard.state.travelExpenseType = ctx.wizard.state.travelExpensesCollection[parseFloat(ctx.message.text - 1)]?.name;
        const WizardState = ctx.wizard.state
        
        const properties = {
            name: WizardState?.travelExpenseName,
            type: WizardState?.travelExpenseType,
            amount: WizardState?.travelExpenseAmount,
            payer: WizardState?.travelExpensePayer,
            travelId: WizardState?.actualTravelData[0].id,
        };
        
        await AddNewTravelExpense(ctx, properties)
        await ctx.reply('Gasto agregado')

        return ctx.scene.leave();
    }
);

export default TRAVEL_EXPENSE_WIZARD;