import { BaseWizard } from '../../class/base-wizard.js';
import { MOVEMENT_TYPES, MOVEMENT_IMAGES } from '../../config/movements.js';
import { createNewMovement } from '../../services/movement-service.js';
import { getTodayDate } from '../../utils/dates.js';
import { getCurrentMonth } from '../../services/month-service.js';
import { getPaymentAccounts } from '../../services/account-service.js';
import { getUnpayedSubscriptions } from '../../services/subscription-service.js';

class SubscriptionWizard extends BaseWizard {
    constructor() {
        const stepDefinitions = [
            { name: 'ASK_FOR_SUBSCRIPTION_NAME', handler: 'askForSubscriptionName' },
            { name: 'ASK_FOR_SUBSCRIPTION_AMOUNT', handler: 'askForSubscriptionAmount' },
            { name: 'SAVE_SUBSCRIPTION', handler: 'saveSubscription' },
            { name: 'SAVE_ACCOUNT_REGISTER_PAYMENT', handler: 'saveAccountAndRegisterSubscription' }
        ];
        const steps = SubscriptionWizard.buildSteps(stepDefinitions);
        super('SUBSCRIPTION', steps);
    }

    async askForSubscriptionName(ctx) {
        const suscriptions = await getUnpayedSubscriptions();
        const { subscriptionList, subscriptionsData } = suscriptions;

        if (subscriptionsData.length === 0) {
            await ctx.reply(`No hay suscripciones pendientes a pagar :)`)
            return ctx.scene.leave();
        }

        ctx.wizard.state.subscriptions = subscriptionsData
        await ctx.reply(`Ingrese índice de suscripción:\n${ subscriptionList }`);

        return ctx.wizard.next();
    }

    async askForSubscriptionAmount(ctx) {

        const subscriptions = ctx.wizard.state.subscriptions;

        if (!subscriptions) {
            await ctx.reply('No se pudo obtener las suscripciones. Intenta nuevamente más tarde.');
            return ctx.scene.leave();
        }

        const subIndex = parseInt(ctx.message.text, 10) - 1;
        const selectedSub = subscriptions[subIndex];

        if (!selectedSub) {
            await ctx.reply('Índice de suscripción inválido. Por favor, vuelva a intentar.');
            return ctx.scene.leave();
        }

        ctx.wizard.state.subscriptionId = selectedSub?.id;
        ctx.wizard.state.subscriptionName = selectedSub?.name;

        await ctx.reply('Por favor, ingresa el monto de la suscripción:');
        return ctx.wizard.next();
    }

    async saveSubscription(ctx) {
        const amount = parseFloat(ctx.message.text);

        if (isNaN(amount) || amount <= 0) {
            await ctx.reply('Por favor, ingresa un monto válido.');
            return;
        }

        ctx.wizard.state.subscriptionAmount = amount;

        const paymentAccounts = await getPaymentAccounts();

        if (!paymentAccounts || !paymentAccounts.accountsData || paymentAccounts.accountsData.length === 0) {
            await ctx.reply('Ocurrió un error al obtener las cuentas. Intenta nuevamente más tarde.');
            return ctx.scene.leave();
        }

        ctx.wizard.state.paymentAccounts = paymentAccounts.accountsData;
        await ctx.reply(`Cuentas disponibles:\n${paymentAccounts.accountsList}`);
        await ctx.reply('¿Con qué cuenta se va a realizar el pago?');

        return ctx.wizard.next();
    }

    async saveAccountAndRegisterSubscription(ctx) {
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

        const subscriptionData = {
            movimientoTipoIO: MOVEMENT_TYPES.Gasto,
            movimientoImagen: MOVEMENT_IMAGES.Gasto,
            movimientoNombre: ctx.wizard.state.subscriptionName,
            movimientoMonto: ctx.wizard.state.subscriptionAmount,
            movimientoTipoNombre: 'Suscripcion',
            movimientoCuentaId: ctx.wizard.state.accountId,
            movimientoSubId: ctx.wizard.state.subscriptionId,
            movimientoFechaActual: await getTodayDate(),
            movimientoMesActualId: await getCurrentMonth()
        };

        await createNewMovement(subscriptionData);
        await ctx.reply('Suscripción registrada exitosamente.');
        return ctx.scene.leave();
    }
}

const SUBSCRIPTION_WIZARD = new SubscriptionWizard().scene;

export default SUBSCRIPTION_WIZARD;