const { Scenes: { WizardScene } } = require('telegraf');
const opcionesDB = require('../../config/databases');
const { opcionesMovimientoTipoIO, opcionesMovimientoImagen } = require('../../config/movements.js')

const { ObtenerTipoGastoIngreso, ObtenerCuentasPagos, ObtenerMesActual, AgregarRegistroNuevo, ObtenerCuotasActivas } = require('../../notion/notion_functions')
const { ObtenerFechaHoy } = require('../../utils/dates')

const GASTO_DATA_WIZARD = new WizardScene(
    'CREAR_GASTO_NUEVO',
    // 0
    async (ctx) => {
        
        ctx.session.GastoIniciado = false
        ctx.reply('Es un producto en cuotas?', {
            reply_markup: {
                inline_keyboard: [[{ text: 'Si', callback_data: 'si' }, { text: 'No', callback_data: 'no' }]]
            }
        });
        return ctx.wizard.next();
    },
    // 1
    async (ctx) => {
        if (ctx.callbackQuery.data == undefined) {
            ctx.reply('Pusiste cualquiera, master')
            ctx.scene.leave();
        } else if (ctx.callbackQuery.data === 'si') {
            const resultCuotas = await ObtenerCuotasActivas(opcionesDB.dbCuotas);
            cuotasActivasColeccion = resultCuotas.cuotasActivasColeccion;
            await ctx.reply(`Indices Cuotas activas:\n${resultCuotas.listaCuotasActivas}`);
            ctx.wizard.state.movimientoTipoNombre = 'Cuota';
            return ctx.wizard.next();
        } else if (ctx.callbackQuery.data === 'no') {
            
            ctx.reply('Nombre del gasto')

            return ctx.wizard.selectStep(4); // Aquí salta al step 4
        }

    },
    // 2 INDICE CUOTA ELEGIDO
    async (ctx) => {
        const movimientoCuotaIndice = parseInt(ctx.message.text);
        if (movimientoCuotaIndice === 0) {
            ctx.session.GastoIniciado = true
            return ctx.scene.enter('CREAR_CUOTA_NUEVA')
        } else {
            const resultCuentas = await ObtenerCuentasPagos(opcionesDB.dbMetPago);

            ctx.wizard.state.movimientoCuotaId = cuotasActivasColeccion[movimientoCuotaIndice]?.cuotaId
            ctx.wizard.state.movimientoNombre = ' Cuota ' + (cuotasActivasColeccion[movimientoCuotaIndice]?.cuotasPagadas + 1) + ' ' + cuotasActivasColeccion[movimientoCuotaIndice]?.cuotaNombre;
            ctx.wizard.state.movimientoMonto = cuotasActivasColeccion[movimientoCuotaIndice]?.cuotaMonto

            cuentasPagosColeccion = resultCuentas.cuentasPagosColeccion
            await ctx.reply(`Cuentas:\n${resultCuentas.listaCuentasPagos}`);
            await ctx.reply(`Con que se paga?`)

            return ctx.wizard.selectStep(3);

        }
    },
    // 3 FINAL - Guarda Cuenta, crea REGISTRO
    async (ctx) => {
        const movimientoCuentaIndice = parseInt(ctx.message.text - 1);
        ctx.wizard.state.movimientoCuentaId = cuentasPagosColeccion[movimientoCuentaIndice]?.cuentaId

        const WizardState = ctx.wizard.state
        movimientoData = {
            movimientoTipoIO: opcionesMovimientoTipoIO?.Gasto,
            movimientoImagen: opcionesMovimientoImagen?.Gasto,
            movimientoCuotaId: WizardState?.movimientoCuotaId,
            movimientoNombre: WizardState?.movimientoNombre,
            movimientoMonto: WizardState?.movimientoMonto,
            movimientoTipoNombre: WizardState?.movimientoTipoNombre,
            movimientoCuentaId: WizardState?.movimientoCuentaId,
            movimientoFechaActual: await ObtenerFechaHoy(),
            movimientoMesActualId: await ObtenerMesActual(opcionesDB.dbMeses)
        };
        // console.log(movimientoData)
        await AgregarRegistroNuevo(ctx, movimientoData)
        return ctx.scene.leave();
    },

    // 4 - Guarda el Nombre, escribe Monto (PARA COMPARTIR CON INGRESO)
    async (ctx) => {
        ctx.wizard.state.movimientoNombre = ctx.message.text
        await ctx.reply(`Monto`)

        return ctx.wizard.next()
    },

    // 5 - Guarda el monto, escribe TipoMovimiento (PARA COMPARTIR CON INGRESO)
    async (ctx) => {
        ctx.wizard.state.movimientoMonto = parseFloat(ctx.message.text)
        resultTiposGasto = await ObtenerTipoGastoIngreso(opcionesDB.dbFlujoPlata);
        tiposGastoIngresoColeccion = resultTiposGasto.tiposGastoIngresoColeccion;
        await ctx.reply(`índice del Tipo de Movimiento:\n${resultTiposGasto.listaGastoTipos}`);
        return ctx.wizard.next()
    },

    // 6 - Guarda TipoMovimiento, escribe Cuentas
    async (ctx) => {
        const resultCuentas = await ObtenerCuentasPagos(opcionesDB.dbMetPago);
        cuentasPagosColeccion = resultCuentas.cuentasPagosColeccion
        await ctx.reply(`Cuentas:\n${resultCuentas.listaCuentasPagos}`);
        await ctx.reply(`Con que se paga?`)

        movimientoTipoIndice = parseInt(ctx.message.text - 1);
        ctx.wizard.state.movimientoTipoNombre = tiposGastoIngresoColeccion[movimientoTipoIndice]?.tipoGastoNombre;

        return ctx.wizard.selectStep(3)
    }
);

module.exports = GASTO_DATA_WIZARD;