const { Scenes: { WizardScene } } = require('telegraf');

const { ObtenerFechaHoy } = require('../../utils/dates')
const { opcionesMovimientoTipoIO, opcionesMovimientoImagen } = require('../../config/movements.js')
const currenyFormatUSD = require('../../config/currency.js')

const { getCreditCardList, getActivePaymentsByCard, ObtenerCuentasPagos, ObtenerMesActual, CreatePayment } = require('../../notion/notion_functions')

const MASSIVE_PAYMENTS_WIZARD = new WizardScene(
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

        const { cuotasActivasColeccion }  = await getActivePaymentsByCard(cardId)
        if (!cuotasActivasColeccion) {
            ctx.reply(`No se han encontrado pendientes. \n Saliendo de la escena...`)
            return ctx.scene.leave()
        }

        ctx.reply('Añadiendo pagos...');

        let totalAmount = 0
        // Create a list of promises and handle them all with Promise.all
        const paymentPromises = cuotasActivasColeccion.map(async (cuota) => {
            if (!cuota.cuotaId) {
                return; // Skips payments without Id (ex: 'Nueva Cuota')
            }

            totalAmount += cuota?.cuotaMonto
    
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
    
        ctx.reply(`Gastos añadidos correctamente por un total de: ${currenyFormatUSD.format(totalAmount)}`);
        return ctx.scene.leave();
    }
)

module.exports = MASSIVE_PAYMENTS_WIZARD;