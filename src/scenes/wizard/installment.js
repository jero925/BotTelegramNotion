import { BaseWizard } from '../../class/base-wizard.js';
import { INSTALLMENT_IMAGE } from '../../config/movements.js';
import { getMonthsInDateRange } from '../../services/month-service.js';
import { createNewInstallment, getNextMonthTotal } from '../../services/installment-service.js';
import { getTodayDate, getFirstDayOfNextMonth } from '../../utils/dates.js';
import { getCreditCardList } from '../../services/account-service.js';

class InstallmentWizard extends BaseWizard {
    constructor() {
        const stepDefinitions = [
            { name: 'NAME', handler: 'askForProductName' },
            { name: 'AMOUNT', handler: 'saveProductNameAndAskForAmount' },
            { name: 'INSTALLMENT_COUNT', handler: 'saveAmountAndAskForInstallmentCount' },
            { name: 'CREDIT_CARD', handler: 'saveInstallmentCountAndAskCreditCard' },
            { name: 'CREATE_INSTALLMENT', handler: 'saveCreditCardAndCreateInstallment' }
        ];
        const steps = InstallmentWizard.buildSteps(stepDefinitions);
        super('CREATE_NEW_INSTALLMENT', steps);
    }

    async askForProductName(ctx) {
        await ctx.reply('Nombre del producto en cuotas');
        return ctx.wizard.next();
    }

    async saveProductNameAndAskForAmount(ctx) {
        const productName = ctx.message.text;

        if (!productName) {
            await ctx.reply('El nombre no puede estar vacío. Por favor, ingresa el nombre del producto.');
            return ctx.scene.reset();
        }

        ctx.wizard.state.productName = productName;
        await ctx.reply('Monto');
        return ctx.wizard.next();
    }

    async saveAmountAndAskForInstallmentCount(ctx) {
        const amount = parseFloat(ctx.message.text);

        if (isNaN(amount) || amount <= 0) {
            await ctx.reply('Por favor, ingresa un monto válido.');
            return;
        }

        ctx.wizard.state.amount = amount;
        await ctx.reply('Cantidad de cuotas');
        return ctx.wizard.next();
    }

    async saveInstallmentCountAndAskCreditCard(ctx) {
        const installmentCount = parseInt(ctx.message.text, 10);

        if (isNaN(installmentCount) || installmentCount <= 0) {
            await ctx.reply('Por favor, ingresa una cantidad de cuotas válida.');
            return;
        }

        ctx.wizard.state.installmentCount = installmentCount.toString();
        const { accountsList, accountsData } = await getCreditCardList();
        ctx.wizard.state.creditCardsData = accountsData;
        await ctx.reply(`Tarjetas:\n${accountsList}`);
        return ctx.wizard.next();
    }

    async saveCreditCardAndCreateInstallment(ctx) {
        const cardIndex = parseInt(ctx.message.text, 10) - 1;

        if (isNaN(cardIndex) || cardIndex < 0) {
            await ctx.reply('Índice de tarjeta inválido. Por favor, elige una tarjeta válida.');
            return ctx.scene.leave();
        }
        
        const WizardState = ctx.wizard.state;
        const todayDate = getTodayDate();
        const firstInstallmentDate = getFirstDayOfNextMonth(todayDate, 1);
        const lastInstallmentDate = getFirstDayOfNextMonth(todayDate, parseInt(WizardState.installmentCount));

        const installmentData = {
            installmentImage: INSTALLMENT_IMAGE,
            productName: WizardState.productName,
            todayDate: todayDate,
            amount: WizardState.amount,
            installmentCount: WizardState.installmentCount,
            firstInstallmentDate: firstInstallmentDate,
            months: await getMonthsInDateRange(firstInstallmentDate, lastInstallmentDate),
            cardId: WizardState.creditCardsData[cardIndex]?.accountId
        };

        await createNewInstallment(installmentData);
        await ctx.reply('Producto en cuotas agregado exitosamente.');

        const totalNextMonth = await getNextMonthTotal()
        if (totalNextMonth) { await ctx.reply(`Resumen del mes siguiente: $${totalNextMonth}`) }
        
        return ctx.scene.leave();
    }
}

const INSTALLMENT_WIZARD = new InstallmentWizard().scene;

export default INSTALLMENT_WIZARD;