import { Scenes } from 'telegraf';
import dbOptions from '../../config/databases.js';
import { installmentImage } from '../../config/movements.js';
import { getMonthsInDateRange } from '../../services/month-service.js';
import { createNewInstallment } from '../../services/installment-service.js';
import { getTodayDate, getFirstDayOfNextMonth } from '../../utils/dates.js';
import { getCreditCardList } from '../../services/account-service.js'

class InstallmentWizard {
    constructor() {
        this.scene = new Scenes.WizardScene(
            'CREATE_NEW_INSTALLMENT',
            this.askForProductName.bind(this),
            this.saveProductNameAndAskForAmount.bind(this),
            this.saveAmountAndAskForInstallmentCount.bind(this),
            this.saveInstallmentCountAndAskCreditCard.bind(this),
            this.saveCreditCardAndCreateInstallment.bind(this)
        );
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

        ctx.wizard.state.installmentCount = installmentCount.toString()
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
        const todayDate = await getTodayDate();
        const firstInstallmentDate = await getFirstDayOfNextMonth(todayDate, 1);
        
        
        const lastInstallmentDate = await getFirstDayOfNextMonth(todayDate, WizardState.installmentCount);

        const installmentData = {
            installmentImage: installmentImage,
            productName: WizardState.productName,
            todayDate: todayDate,
            amount: WizardState.amount,
            installmentCount: WizardState.installmentCount,
            firstInstallmentDate: firstInstallmentDate,
            months: await getMonthsInDateRange(dbOptions.dbMeses, firstInstallmentDate, lastInstallmentDate),
            cardId: WizardState.creditCardsData[cardIndex]?.accountId
        };

        await createNewInstallment(installmentData);
        await ctx.reply('Producto en cuotas agregado exitosamente.');

        return ctx.scene.leave();
    }
}

const INSTALLMENT_WIZARD = new InstallmentWizard().scene;

export default INSTALLMENT_WIZARD;