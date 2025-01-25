import { Scenes, Markup } from 'telegraf';

import opcionesDB from '../../config/databases.js';
import { ObtenerFechaHoy } from '../../utils/dates.js';
import { opcionesMovimientoTipoIO, opcionesMovimientoImagen } from '../../config/movements.js';

import {
    ObtenerTipoGastoIngreso,
    ObtenerCuentasPagos,
    ObtenerMesActual,
    AgregarRegistroNuevo,
    getActivePayments
} from '../../notion/notion_functions.js';

const GASTO_DATA_WIZARD = new Scenes.WizardScene(
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

    // 1 - Procesa la respuesta sobre cuotas
    async (ctx) => {
        const { data } = ctx.callbackQuery;

        if (!data) {
            await ctx.reply('Por favor, selecciona una opción válida.');
            return ctx.scene.leave();
        }

        if (data === 'si') {
            const resultCuotas = await getActivePayments();
            const { cuotasActivasColeccion, listaCuotasActivas } = resultCuotas;

            if (!cuotasActivasColeccion || cuotasActivasColeccion.length === 0) {
                await ctx.reply('No hay cuotas activas disponibles.');
                return ctx.scene.leave();
            }

            ctx.wizard.state.cuotasActivasColeccion = cuotasActivasColeccion;
            await ctx.reply(`Índices Cuotas activas:\n${listaCuotasActivas}`, Markup.inlineKeyboard([
                Markup.button.callback('Pago por cuenta', 'accounts')
            ]));
            ctx.wizard.state.movimientoTipoNombre = 'Cuota';
            return ctx.wizard.next();
        }

        // Si se eligió "No"
        await ctx.reply('Por favor, ingresa el nombre del gasto:');
        return ctx.wizard.selectStep(4);

    },

    // 2 - Procesa el índice de cuota o redirige a la creación de una nueva cuota
    async (ctx) => {
        
        if (ctx.callbackQuery?.data === 'accounts') {
            return ctx.scene.enter('MASSIVE_PAYMENTS');
        }
        
        const { text } = ctx.message;
        const movimientoCuotaIndice = parseInt(text, 10);

        if (movimientoCuotaIndice === 0) {
            ctx.session.GastoIniciado = true;
            return ctx.scene.enter('CREAR_CUOTA_NUEVA');
        }

        const cuotasActivasColeccion = ctx.wizard.state.cuotasActivasColeccion;
        const cuotaSeleccionada = cuotasActivasColeccion[movimientoCuotaIndice];

        if (!cuotaSeleccionada) {
            await ctx.reply('Índice de cuota inválido. Por favor, elige un índice válido.');
            return ctx.scene.leave();
        }

        ctx.wizard.state.movimientoCuotaId = cuotaSeleccionada.cuotaId;
        ctx.wizard.state.movimientoNombre = `Cuota ${cuotaSeleccionada?.cuotasPagadas + 1} ${cuotaSeleccionada?.cuotaNombre}`;
        ctx.wizard.state.movimientoMonto = cuotaSeleccionada?.cuotaMonto;

        const resultCuentas = await ObtenerCuentasPagos();
        const { accountsData, accountsList } = resultCuentas;

        if (!accountsData || accountsData.length === 0) {
            await ctx.reply('No se encontraron cuentas. Intenta nuevamente más tarde.');
            return ctx.scene.leave();
        }

        ctx.wizard.state.cuentasPagosColeccion = accountsData;
        await ctx.reply(`Cuentas disponibles:\n${accountsList}`);
        await ctx.reply('¿Con qué cuenta se va a realizar el pago?');
        return ctx.wizard.selectStep(3);
    },

    // 3 - Guarda la cuenta seleccionada y crea el registro
    async (ctx) => {
        const cuentasPagosColeccion = ctx.wizard.state.cuentasPagosColeccion;

        if (!cuentasPagosColeccion) {
            await ctx.reply('Ocurrió un error al obtener las cuentas. Intenta nuevamente más tarde.');
            return ctx.scene.leave();
        }

        const movimientoCuentaIndice = parseInt(ctx.message.text, 10) - 1;
        const cuentaSeleccionada = cuentasPagosColeccion[movimientoCuentaIndice];

        if (!cuentaSeleccionada) {
            await ctx.reply('Índice de cuenta inválido. Por favor, selecciona una cuenta válida.');
            return ctx.scene.leave();
        }

        ctx.wizard.state.movimientoCuentaId = cuentaSeleccionada?.cuentaId;
        const WizardState = ctx.wizard.state;

        const movimientoData = {
            movimientoTipoIO: opcionesMovimientoTipoIO?.Gasto,
            movimientoImagen: opcionesMovimientoImagen?.Gasto,
            movimientoCuotaId: WizardState?.movimientoCuotaId,
            movimientoNombre: WizardState?.movimientoNombre,
            movimientoMonto: WizardState?.movimientoMonto,
            movimientoTipoNombre: WizardState?.movimientoTipoNombre,
            movimientoCuentaId: WizardState?.movimientoCuentaId,
            movimientoFechaActual: await ObtenerFechaHoy(),
            movimientoMesActualId: await ObtenerMesActual()
        };

        await AgregarRegistroNuevo(ctx, movimientoData);
        return ctx.scene.leave();
    },

    // 4 - Guarda el nombre y pregunta por el monto (compartido con INGRESO)
    async (ctx) => {
        ctx.wizard.state.movimientoNombre = ctx.message.text;
        await ctx.reply('Por favor, ingresa el monto:');
        return ctx.wizard.next();
    },

    // 5 - Guarda el monto y pregunta el tipo de movimiento (compartido con INGRESO)
    async (ctx) => {
        const monto = parseFloat(ctx.message.text);

        if (isNaN(monto) || monto <= 0) {
            await ctx.reply('Por favor, ingresa un monto válido.');
            return;
        }

        ctx.wizard.state.movimientoMonto = monto;

        const resultTiposGasto = await ObtenerTipoGastoIngreso(opcionesDB.dbFlujoPlata);

        if (!resultTiposGasto || !resultTiposGasto.tiposGastoIngresoColeccion) {
            await ctx.reply('Ocurrió un error al obtener los tipos de gasto. Intenta nuevamente más tarde.');
            return ctx.scene.leave();
        }

        const { listaGastoTipos, tiposGastoIngresoColeccion } = resultTiposGasto;

        ctx.wizard.state.tiposGastoIngresoColeccion = tiposGastoIngresoColeccion;

        await ctx.reply(`Índice del Tipo de Movimiento:\n${listaGastoTipos}`);
        return ctx.wizard.next();
    },


    async (ctx) => {
        const { text } = ctx.message;
        const movimientoTipoIndice = parseInt(text, 10) - 1;

        if (isNaN(movimientoTipoIndice) || movimientoTipoIndice < 0) {
            await ctx.reply('Índice de tipo de movimiento inválido. Por favor, elige un tipo válido.');
            return;
        }

        const tiposGastoIngresoColeccion = ctx.wizard.state.tiposGastoIngresoColeccion;

        if (!tiposGastoIngresoColeccion) {
            await ctx.reply('Ocurrió un error al obtener los tipos de gasto. Intenta nuevamente más tarde.');
            return ctx.scene.leave();
        }

        ctx.wizard.state.movimientoTipoNombre = tiposGastoIngresoColeccion[movimientoTipoIndice]?.tipoGastoNombre;
        const resultCuentas = await ObtenerCuentasPagos();

        if (!resultCuentas) {
            await ctx.reply('Ocurrió un error al obtener las cuentas. Intenta nuevamente más tarde.');
            return ctx.scene.leave();
        }

        ctx.wizard.state.cuentasPagosColeccion = resultCuentas.accountsData;
        await ctx.reply(`Cuentas:\n${resultCuentas.accountsList}`);
        await ctx.reply('¿Con qué se paga?');

        return ctx.wizard.selectStep(3);
    });

export default GASTO_DATA_WIZARD;