import { Scenes } from 'telegraf';

import { ObtenerFechaHoy } from '../../utils/dates.js';
import { opcionesMovimientoTipoIO, opcionesMovimientoImagen } from '../../config/movements.js';
import currenyFormatUSD from '../../config/currency.js';

import {
    getCreditCardList,
    ObtenerCuentasPagos,
    ObtenerMesActual,
    CreatePayment
} from '../../notion/notion-functions.js';

import { getActivePaymentsByCard } from '../../notion/due-payments.js';

const MASSIVE_PAYMENTS_WIZARD = new Scenes.WizardScene(
    'MASSIVE_PAYMENTS',
    // Get credit cards with pending payments
    async (ctx) => {

        const { accountsList, accountsData } = await getCreditCardList()
        ctx.wizard.state.creditCardsData = accountsData;
        await ctx.reply(`Tarjetas:\n${accountsList}`);

        return ctx.wizard.next();
    },
    // Saves card index, get payment account
    async (ctx) => {
        ctx.wizard.state.cardIndex = parseInt(ctx.message.text - 1);
        const { accountsList, accountsData } = await ObtenerCuentasPagos();
        ctx.wizard.state.paymentAccountsData = accountsData
        await ctx.reply(`Con que se paga?`);
        await ctx.reply(`Cuentas:\n${accountsList}`);

        return ctx.wizard.next();
    },
    // Saves account index, creates registers
    async (ctx) => {
        const accountIndex = parseInt(ctx.message.text - 1);

        const WizardState = ctx.wizard.state
        const accountId = WizardState.paymentAccountsData[accountIndex]?.cuentaId
        const cardIndex = WizardState.cardIndex

        const cardId = ctx.wizard.state.creditCardsData[cardIndex]?.cuentaId

        const { cuotasActivasColeccion } = await getActivePaymentsByCard(cardId)
        if (!cuotasActivasColeccion) {
            ctx.reply(`No se han encontrado pendientes. \n Saliendo...`)
            return ctx.scene.leave()
        }

        ctx.reply('Añadiendo pagos...');

        let totalAmount = 0
        let addedPayments = ''
        // Create a list of promises and handle them all with Promise.all
        const paymentPromises = cuotasActivasColeccion.map(async (cuota) => {
            if (!cuota.cuotaId) {
                return; // Skips payments without Id (ex: 'Nueva Cuota')
            }

            totalAmount += cuota?.cuotaMonto
            addedPayments += `\n${cuota?.cuotaNombre} - $${cuota?.cuotaMonto}`

            const movimientoData = {
                movimientoTipoIO: opcionesMovimientoTipoIO?.Gasto,
                movimientoImagen: opcionesMovimientoImagen?.Gasto,
                movimientoCuotaId: cuota.cuotaId,
                movimientoNombre: `Cuota ${cuota?.cuotasPagadas + 1} ${cuota?.cuotaNombre}`,
                movimientoMonto: cuota?.cuotaMonto,
                movimientoTipoNombre: 'Cuota',
                movimientoCuentaId: accountId,
                movimientoFechaActual: await ObtenerFechaHoy(),
                movimientoMesActualId: await ObtenerMesActual()
            };

            return CreatePayment(ctx, movimientoData);
        });

        // Wait for all the promises to resolve
        await Promise.all(paymentPromises);
        ctx.reply(`Gastos añadidos correctamente: ${addedPayments}
        
Total: ${currenyFormatUSD.format(totalAmount)}`);
        return ctx.scene.leave();
    }
);

export default MASSIVE_PAYMENTS_WIZARD;