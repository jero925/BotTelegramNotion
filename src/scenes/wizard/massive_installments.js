import { Scenes } from 'telegraf';
import { getTodayDate } from '../../utils/dates.js';
import { MOVEMENT_TYPES, MOVEMENT_IMAGES } from '../../config/movements.js';
import { formatCurrencyUSD } from '../../config/currency.js';
import { getCurrentMonth } from '../../services/month-service.js';
import { getActiveCreditCardList, getPaymentAccounts } from '../../services/account-service.js'
import { createNewMovement } from '../../services/movement-service.js';
import { getActiveInstallmentsByCard } from '../../services/installment-service.js';

class MassiveInstallmentsWizard {
    constructor() {
        this.scene = new Scenes.WizardScene(
            'MASSIVE_INSTALLMENTS',
            this.getCreditCardsWithPendingInstallments.bind(this),
            this.saveCardIndexAndGetPaymentAccount.bind(this),
            this.saveAccountIndexAndCreateRegisters.bind(this)
        );
    }

    async getCreditCardsWithPendingInstallments(ctx) {
        const { accountsList, accountsData } = await getActiveCreditCardList();
        ctx.wizard.state.creditCardsData = accountsData;
        await ctx.reply(`Tarjetas:\n${accountsList}`);
        return ctx.wizard.next();
    }

    async saveCardIndexAndGetPaymentAccount(ctx) {
        const cardIndex = parseInt(ctx.message.text, 10) - 1;

        if (isNaN(cardIndex) || cardIndex < 0 || cardIndex >= ctx.wizard.state.creditCardsData.length) {
            await ctx.reply('Índice de tarjeta inválido. Por favor, elige una tarjeta válida.');
            return ctx.scene.leave();
        }

        ctx.wizard.state.cardIndex = cardIndex;

        const { accountsList, accountsData } = await getPaymentAccounts();
        ctx.wizard.state.paymentAccountsData = accountsData;
        await ctx.reply('¿Con qué se paga?');
        await ctx.reply(`Cuentas:\n${accountsList}`);

        return ctx.wizard.next();
    }

    async saveAccountIndexAndCreateRegisters(ctx) {
        const accountIndex = parseInt(ctx.message.text, 10) - 1;

        if (isNaN(accountIndex) || accountIndex < 0 || accountIndex >= ctx.wizard.state.paymentAccountsData.length) {
            await ctx.reply('Índice de cuenta inválido. Por favor, selecciona una cuenta válida.');
            return ctx.scene.leave();
        }

        const WizardState = ctx.wizard.state;
        const accountId = WizardState.paymentAccountsData[accountIndex]?.accountId;
        const cardId = WizardState.creditCardsData[WizardState.cardIndex]?.accountId;

        const { activeInstallmentsCollection } = await getActiveInstallmentsByCard(cardId);

        if (!activeInstallmentsCollection || activeInstallmentsCollection.length === 0) {
            await ctx.reply('No se han encontrado cuotas pendientes. Saliendo...');
            return ctx.scene.leave();
        }

        await ctx.reply('Añadiendo pagos...');

        let totalAmount = 0;
        let addedPayments = '';

        const paymentPromises = activeInstallmentsCollection.map(async (installment) => {
            if (!installment.installmentId) {
                return; // Salta cuotas sin ID (ej: 'Nueva Cuota')
            }

            totalAmount += installment?.installmentAmount;
            addedPayments += `\n${installment?.installmentName} - $${installment?.installmentAmount}`;

            const movementData = {
                movimientoTipoIO: MOVEMENT_TYPES.Gasto,
                movimientoImagen: MOVEMENT_IMAGES.Gasto,
                movimientoCuotaId: installment.installmentId,
                movimientoNombre: `Cuota ${installment?.paidInstallments + 1} ${installment?.installmentName}`,
                movimientoMonto: installment?.installmentAmount,
                movimientoTipoNombre: 'Cuota',
                movimientoCuentaId: accountId,
                movimientoFechaActual: await getTodayDate(),
                movimientoMesActualId: await getCurrentMonth()
            };

            return createNewMovement(movementData);
        });

        await Promise.all(paymentPromises);
        await ctx.reply(`Gastos añadidos correctamente: ${addedPayments}\n\nTotal: ${formatCurrencyUSD.format(totalAmount)}`);
        return ctx.scene.leave();
    }
}

const MASSIVE_INSTALLMENTS_WIZARD = new MassiveInstallmentsWizard().scene;

export default MASSIVE_INSTALLMENTS_WIZARD;