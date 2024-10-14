const { Scenes: { WizardScene } } = require('telegraf');
const opcionesDB = require('../../config/databases');
const { opcionesMovimientoTipoIO, opcionesMovimientoImagen } = require('../../config/movements.js')

const { ObtenerTipoGastoIngreso, ObtenerCuentasPagos, ObtenerMesActual, AgregarRegistroNuevo } = require('../../notion/notion_functions')
const { ObtenerFechaHoy } = require('../../utils/dates')

const INGRESO_DATA_WIZARD = new WizardScene(
    'CREAR_INGRESO_NUEVO',
    // 0 - Pregunta nombre
    async (ctx) => {
        await ctx.reply('Nombre del ingreso')

        return ctx.wizard.next();
    },
    // 1 - Guarda Nombre, pregunta Monto
    async (ctx) => {
        ctx.wizard.state.movimientoNombre = ctx.message.text
        await ctx.reply(`Monto`)

        return ctx.wizard.next()
    },
    // 2 - Guarda Monto, pregunta Tipo Movimiento
    async (ctx) => {
        ctx.wizard.state.movimientoMonto = parseFloat(ctx.message.text)
        resultTiposIngreso = await ObtenerTipoGastoIngreso(opcionesDB.dbFlujoPlata);
        tiposGastoIngresoColeccion = resultTiposIngreso.tiposGastoIngresoColeccion;
        await ctx.reply(`índice del Tipo de Movimiento:\n${resultTiposIngreso.listaGastoTipos}`);
        return ctx.wizard.next()
    },
    // 3 - Guarda TipoMovimiento, escribe Cuentas
    async (ctx) => {
        const movimientoTipoIndice = parseInt(ctx.message.text - 1);
        const resultCuentas = await ObtenerCuentasPagos();
        cuentasPagosColeccion = resultCuentas.accountsData
        await ctx.reply(`Cuentas:\n${resultCuentas.accountsList}`);

        ctx.wizard.state.movimientoTipoNombre = tiposGastoIngresoColeccion[movimientoTipoIndice]?.tipoGastoNombre;

        return ctx.wizard.next()
    },
    // 4 FINAL, ingresa movimiento
    async (ctx) => {
        const movimientoCuentaIndice = parseInt(ctx.message.text - 1);
        ctx.wizard.state.movimientoCuentaId = cuentasPagosColeccion[movimientoCuentaIndice]?.cuentaId

        const WizardState = ctx.wizard.state
        movimientoData = {
            movimientoTipoIO: opcionesMovimientoTipoIO?.Ingreso,
            movimientoImagen: opcionesMovimientoImagen?.Ingreso,
            movimientoNombre: WizardState?.movimientoNombre,
            movimientoMonto: WizardState?.movimientoMonto,
            movimientoTipoNombre: WizardState?.movimientoTipoNombre,
            movimientoCuentaId: WizardState?.movimientoCuentaId,
            movimientoFechaActual: await ObtenerFechaHoy(),
            movimientoMesActualId: await ObtenerMesActual()
        };
        // console.log(movimientoData)
        await AgregarRegistroNuevo(ctx, movimientoData)
        return ctx.scene.leave();
    },
)

module.exports = INGRESO_DATA_WIZARD;