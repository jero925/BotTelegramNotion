const { Scenes: { WizardScene } } = require('telegraf');
const opcionesDB = require('../../config/databases');
const { cuotaImagen } = require('../../config/movements.js')

const { ObtenerMesesEnRangoFecha, CrearPaginaCuotaNueva } = require('../../notion/notion_functions')
const { ObtenerFechaHoy, ObtenerPrimerDiaMesSiguiente } = require('../../utils/dates')

const CUOTA_DATA_WIZARD = new WizardScene(
    'CREAR_CUOTA_NUEVA',
    // 0 - Pregunta nombre
    async (ctx) => {
        await ctx.reply('Nombre del producto en cuotas')

        return ctx.wizard.next();
    },
    // 1 - Guarda Nombre, pregunta Monto
    async (ctx) => {
        ctx.wizard.state.cuotaNombre = ctx.message.text
        await ctx.reply(`Monto`)

        return ctx.wizard.next()
    },
    // 2 - Guarda Monto, pregunta Cantidad de Cuotas
    async (ctx) => { //Podria meterle un inline button con las opciones mas comunes y a la mierda
        ctx.wizard.state.cuotaMonto = parseFloat(ctx.message.text)
        await ctx.reply(`Cantidad de Cuotas`);
        return ctx.wizard.next()
    },

    // 3 FINAL - Guarda CantCuotas
    async (ctx) => {
        ctx.wizard.state.cuotaCantidadCuotas = ctx.message.text
        const WizardState = ctx.wizard.state;
        const fechaActual = await ObtenerFechaHoy();
        const fechaPrimerCuota = await ObtenerPrimerDiaMesSiguiente(fechaActual, 1);
        const fechaUltimaCuota = await ObtenerPrimerDiaMesSiguiente(fechaActual, parseFloat(WizardState?.cuotaCantidadCuotas));
        const datosCuota = {
            cuotaNombre: WizardState?.cuotaNombre,
            cuotaMonto: WizardState?.cuotaMonto,
            cuotaCantidadCuotas: WizardState?.cuotaCantidadCuotas,
            cuotaImagen: cuotaImagen,
            cuotaFechaActual: fechaActual,
            cuotaFechaPrimerCuota: fechaPrimerCuota,
            cuotaMeses: await ObtenerMesesEnRangoFecha(opcionesDB.dbMeses, fechaPrimerCuota, fechaUltimaCuota)

        };
        // console.log(datosCuota)
        await CrearPaginaCuotaNueva(opcionesDB.dbCuotas, datosCuota)
        await ctx.reply('Producto en cuotas agregado')

        return ctx.scene.leave();
    },
)

module.exports = CUOTA_DATA_WIZARD;