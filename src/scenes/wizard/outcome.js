import { Scenes, Markup } from 'telegraf';
import dbOptions from '../../config/databases.js';
import { movementTypeIOOptions, movementImageOptions } from '../../config/movements.js';
import { retrieveDatabase } from '../../services/notion-service.js';
import { getCurrentMonth } from '../../services/month-service.js';
import { getPaymentAccounts } from '../../services/account-service.js';
import { createNewMovement } from '../../services/movement-service.js';
import { getActivePayments } from '../../services/installment-service.js';
import { getTodayDate } from '../../utils/dates.js';

class ExpenseWizard {
    constructor() {
        this.scene = new Scenes.WizardScene(
            'CREATE_NEW_EXPENSE',
            this.askIfInstallment.bind(this),
            this.processInstallmentResponse.bind(this),
            this.processInstallmentIndexOrRedirect.bind(this),
            this.saveAccountAndRegisterExpense.bind(this),
            this.saveExpenseNameAndAskForAmount.bind(this),
            this.saveAmountAndAskForMovementType.bind(this),
            this.saveMovementTypeAndAskForAccount.bind(this)
        );
    }

    async askIfInstallment(ctx) {
        ctx.session.expenseStarted = false;
        await ctx.reply('Es un producto en cuotas?', {
            reply_markup: {
                inline_keyboard: [[{ text: 'Sí', callback_data: 'yes' }, { text: 'No', callback_data: 'no' }]]
            }
        });
        return ctx.wizard.next();
    }

    async processInstallmentResponse(ctx) {
        const { data } = ctx.callbackQuery;

        if (!data) {
            await ctx.reply('Por favor, selecciona una opción válida.');
            return ctx.scene.leave();
        }

        if (data === 'yes') {
            const activeInstallments = await getActivePayments();
            const { activeInstallmentsCollection, activeInstallmentsList } = activeInstallments;

            if (!activeInstallmentsCollection || activeInstallmentsCollection.length === 0) {
                await ctx.reply('No hay cuotas activas disponibles.');
                return ctx.scene.leave();
            }

            ctx.wizard.state.activeInstallmentsCollection = activeInstallmentsCollection;
            await ctx.reply(`Índices de cuotas activas:\n${activeInstallmentsList}`, Markup.inlineKeyboard([
                Markup.button.callback('Pago por cuenta', 'accounts')
            ]));
            ctx.wizard.state.movementTypeName = 'Cuota';
            return ctx.wizard.next();
        }

        // Si se eligió "No"
        await ctx.reply('Por favor, ingresa el nombre del gasto:');
        return ctx.wizard.selectStep(4);
    }

    async processInstallmentIndexOrRedirect(ctx) {
        if (ctx.callbackQuery?.data === 'accounts') {
            return ctx.scene.enter('MASSIVE_PAYMENTS');
        }

        const { text } = ctx.message;
        const installmentIndex = parseInt(text, 10);

        if (installmentIndex === 0) {
            ctx.session.expenseStarted = true;
            return ctx.scene.enter('CREATE_NEW_INSTALLMENT');
        }

        const activeInstallmentsCollection = ctx.wizard.state.activeInstallmentsCollection;
        const selectedInstallment = activeInstallmentsCollection[installmentIndex];

        if (!selectedInstallment) {
            await ctx.reply('Índice de cuota inválido. Por favor, elige un índice válido.');
            return ctx.scene.leave();
        }

        ctx.wizard.state.installmentId = selectedInstallment.installmentId;
        ctx.wizard.state.expenseName = `Cuota ${selectedInstallment?.paidInstallments + 1} ${selectedInstallment?.installmentName}`;
        ctx.wizard.state.expenseAmount = selectedInstallment?.installmentAmount;

        const paymentAccounts = await getPaymentAccounts();
        const { accountsData, accountsList } = paymentAccounts;

        if (!accountsData || accountsData.length === 0) {
            await ctx.reply('No se encontraron cuentas. Intenta nuevamente más tarde.');
            return ctx.scene.leave();
        }

        ctx.wizard.state.paymentAccounts = accountsData;
        await ctx.reply(`Cuentas disponibles:\n${accountsList}`);
        await ctx.reply('¿Con qué cuenta se va a realizar el pago?');
        return ctx.wizard.selectStep(3);
    }

    async saveAccountAndRegisterExpense(ctx) {
        const paymentAccounts = ctx.wizard.state.paymentAccounts;

        if (!paymentAccounts) {
            await ctx.reply('Ocurrió un error al obtener las cuentas. Intenta nuevamente más tarde.');
            return ctx.scene.leave();
        }

        const accountIndex = parseInt(ctx.message.text, 10) - 1;
        const selectedAccount = paymentAccounts[accountIndex];

        if (!selectedAccount) {
            await ctx.reply('Índice de cuenta inválido. Por favor, selecciona una cuenta válida.');
            return ctx.scene.leave();
        }

        ctx.wizard.state.accountId = selectedAccount?.accountId;

        const expenseData = {
            movimientoTipoIO: movementTypeIOOptions.Gasto,
            movimientoImagen: movementImageOptions.Gasto,
            movimientoCuotaId: ctx.wizard.state.installmentId,
            movimientoNombre: ctx.wizard.state.expenseName,
            movimientoMonto: ctx.wizard.state.expenseAmount,
            movimientoTipoNombre: ctx.wizard.state.movementTypeName,
            movimientoCuentaId: ctx.wizard.state.accountId,
            movimientoFechaActual: await getTodayDate(),
            movimientoMesActualId: await getCurrentMonth()
        };

        await createNewMovement(expenseData);
        await ctx.reply('Gasto registrado exitosamente.');
        return ctx.scene.leave();
    }

    async saveExpenseNameAndAskForAmount(ctx) {
        ctx.wizard.state.expenseName = ctx.message.text;
        await ctx.reply('Por favor, ingresa el monto:');
        return ctx.wizard.next();
    }

    async saveAmountAndAskForMovementType(ctx) {
        const amount = parseFloat(ctx.message.text);

        if (isNaN(amount) || amount <= 0) {
            await ctx.reply('Por favor, ingresa un monto válido.');
            return;
        }

        ctx.wizard.state.expenseAmount = amount;

        const movementTypes = await this.getMovementTypes();

        if (!movementTypes || movementTypes.length === 0) {
            await ctx.reply('Ocurrió un error al obtener los tipos de gasto. Intenta nuevamente más tarde.');
            return ctx.scene.leave();
        }

        ctx.wizard.state.movementTypes = movementTypes;

        await ctx.reply(`Índice del Tipo de Movimiento:\n${this.formatMovementTypes(movementTypes)}`);
        return ctx.wizard.next();
    }

    async saveMovementTypeAndAskForAccount(ctx) {
        const movementTypeIndex = parseInt(ctx.message.text, 10) - 1;
        const movementTypes = ctx.wizard.state.movementTypes;

        if (isNaN(movementTypeIndex) || movementTypeIndex < 0) {
            await ctx.reply('Índice de tipo de movimiento inválido. Por favor, elige un tipo válido.');
            return;
        }

        ctx.wizard.state.movementTypeName = movementTypes[movementTypeIndex]?.name;

        const paymentAccounts = await getPaymentAccounts();

        if (!paymentAccounts || !paymentAccounts.accountsData || paymentAccounts.accountsData.length === 0) {
            await ctx.reply('Ocurrió un error al obtener las cuentas. Intenta nuevamente más tarde.');
            return ctx.scene.leave();
        }

        ctx.wizard.state.paymentAccounts = paymentAccounts.accountsData;
        await ctx.reply(`Cuentas:\n${paymentAccounts.accountsList}`);
        await ctx.reply('¿Con qué se paga?');

        return ctx.wizard.selectStep(3);
    }

    async getMovementTypes() {
        const databaseId = dbOptions.dbFlujoPlata;
        const response = await retrieveDatabase(databaseId);
        return response.properties.Tipo.multi_select.options.map((option, index) => ({
            index: index + 1,
            id: option.id,
            name: option.name
        }));
    }

    formatMovementTypes(movementTypes) {
        return movementTypes.map((type, index) => `${index + 1} - ${type.name}`).join('\n');
    }
}

const EXPENSE_WIZARD = new ExpenseWizard().scene;

export default EXPENSE_WIZARD;