import { Scenes } from 'telegraf';
import opcionesDB from '../../config/databases.js';
import { opcionesMovimientoTipoIO, opcionesMovimientoImagen } from '../../config/movements.js';

import {
    ObtenerTipoGastoIngreso,
    ObtenerCuentasPagos,
    ObtenerMesActual,
    AgregarRegistroNuevo
} from '../../notion/notion_functions.js';

import { ObtenerFechaHoy } from '../../utils/dates.js';

const INGRESO_DATA_WIZARD = new Scenes.WizardScene(
    'CREAR_INGRESO_NUEVO',
    // 0 - Pregunta nombre
    async (ctx) => {
        await ctx.reply('Nombre del ingreso')
        return ctx.wizard.next();
    },

    // 1 - Guarda Nombre, pregunta Monto
    async (ctx) => {
        if (!ctx.message.text) {
            await ctx.reply('El nombre no puede estar vacío. Por favor, ingresa el nombre del ingreso.');
            ctx.scene.reset();
        }

        ctx.wizard.state.movimientoNombre = ctx.message.text
        await ctx.reply(`Monto`)
        return ctx.wizard.next()
    },
    // 2 - Guarda Monto, pregunta Tipo Movimiento
    async (ctx) => {
        const monto = parseFloat(ctx.message.text);

        // Validar monto
        if (isNaN(monto) || monto <= 0) {
            await ctx.reply('Por favor, ingresa un monto válido.');
            return;
        }

        ctx.wizard.state.movimientoMonto = monto;

        const resultTiposIngreso = await ObtenerTipoGastoIngreso(opcionesDB.dbFlujoPlata);
        const tiposGastoIngresoColeccion = resultTiposIngreso.tiposGastoIngresoColeccion;

        if (!tiposGastoIngresoColeccion || tiposGastoIngresoColeccion.length === 0) {
            await ctx.reply('No se encontraron tipos de ingreso. Intenta nuevamente más tarde.');
            return ctx.scene.leave();
        }

        ctx.wizard.state.tiposGastoIngresoColeccion = tiposGastoIngresoColeccion;

        await ctx.reply(`índice del Tipo de Movimiento:\n${resultTiposIngreso.listaGastoTipos}`);
        return ctx.wizard.next()
    },

    // 3 - Guarda TipoMovimiento, escribe Cuentas
    async (ctx) => {
        const movimientoTipoIndice = parseInt(ctx.message.text) - 1;  // Ajustar índice de 1 a 0
        const tiposGastoIngresoColeccion = ctx.wizard.state.tiposGastoIngresoColeccion;

        // Validar índice
        if (isNaN(movimientoTipoIndice) || movimientoTipoIndice < 0) {
            await ctx.reply('Índice de tipo de movimiento inválido. Por favor, elige un tipo válido.');
            return;
        }
        
        ctx.wizard.state.movimientoTipoNombre = tiposGastoIngresoColeccion[movimientoTipoIndice]?.tipoGastoNombre;

        const resultCuentas = await ObtenerCuentasPagos();

        if (!resultCuentas || !resultCuentas.accountsData || resultCuentas.accountsData.length === 0) {
            await ctx.reply('No se encontraron cuentas. Intenta nuevamente más tarde.');
            return ctx.scene.leave();
        }

        ctx.wizard.state.cuentasPagosColeccion = resultCuentas.accountsData;

        await ctx.reply(`Cuentas:\n${resultCuentas.accountsList}`);
        await ctx.reply('Dónde entra la plata?');

        return ctx.wizard.next();
    },
    
    // 4 FINAL, ingresa movimiento
    async (ctx) => {
        const movimientoCuentaIndice = parseInt(ctx.message.text) - 1;  // Ajustar índice de 1 a 0
        const cuentasPagosColeccion = ctx.wizard.state.cuentasPagosColeccion;

        // Validar cuenta seleccionada
        if (isNaN(movimientoCuentaIndice) || movimientoCuentaIndice < 0 || movimientoCuentaIndice >= cuentasPagosColeccion.length) {
            await ctx.reply('Índice de cuenta inválido. Por favor, elige una cuenta válida.');
            return;
        }
        
        ctx.wizard.state.movimientoCuentaId = cuentasPagosColeccion[movimientoCuentaIndice]?.cuentaId;

        const WizardState = ctx.wizard.state;
        const movimientoData = {
            movimientoTipoIO: opcionesMovimientoTipoIO?.Ingreso,
            movimientoImagen: opcionesMovimientoImagen?.Ingreso,
            movimientoNombre: WizardState?.movimientoNombre,
            movimientoMonto: WizardState?.movimientoMonto,
            movimientoTipoNombre: WizardState?.movimientoTipoNombre,
            movimientoCuentaId: WizardState?.movimientoCuentaId,
            movimientoFechaActual: await ObtenerFechaHoy(),
            movimientoMesActualId: await ObtenerMesActual()
        };

        await AgregarRegistroNuevo(ctx, movimientoData);
        await ctx.reply('Ingreso registrado exitosamente.');

        return ctx.scene.leave();
    },
);

export default INGRESO_DATA_WIZARD;