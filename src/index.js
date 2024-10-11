const { Telegraf, Scenes: { Stage, WizardScene }, session, Composer } = require('telegraf');

const opcionesDB = require('./config/databases.js');
const { opcionesMovimientoTipoIO, opcionesMovimientoImagen, cuotaImagen } = require('./config/movements.js')
const ObtenerFechaHoy = require('./utils/dates.js')
const { CrearMovimientoNuevo, ObtenerCuentasPagos, ObtenerTipoGastoIngreso, getTravelExpenseType, CreateTravelExpensePage, getActualTravel, CrearPaginaCuotaNueva, ObtenerCuotasActivas, ObtenerMesActual } = require('./notion/notion_functions.js')

// Crear instancias del bot y el cliente de Notion
const bot = new Telegraf(process.env.BOT_TOKEN);

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
        const resultCuentas = await ObtenerCuentasPagos(opcionesDB.dbMetPago);
        cuentasPagosColeccion = resultCuentas.cuentasPagosColeccion
        await ctx.reply(`Cuentas:\n${resultCuentas.listaCuentasPagos}`);

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
            movimientoMesActualId: await ObtenerMesActual(opcionesDB.dbMeses)
        };
        // console.log(movimientoData)
        await AgregarRegistroNuevo(ctx, movimientoData)
        return ctx.scene.leave();
    },
)

const GASTO_DATA_WIZARD = new WizardScene(
    'CREAR_GASTO_NUEVO', // first argument is Scene_ID, same as for BaseScene
    // 0
    async (ctx) => {
        console.log('entra');
        
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
            console.log('no');
            
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

const TRAVEL_EXPENSE_WIZARD = new WizardScene(
    'CREATE_TRAVEL_EXPENSE',
    // 0
    async (ctx) => {
        ctx.reply('Nombre del gasto')
        return ctx.wizard.next();
    },

    // 1 - Guarda el Nombre, escribe Monto (PARA COMPARTIR CON INGRESO Y GASTO)
    async (ctx) => {
        ctx.wizard.state.travelExpenseName = ctx.message.text
        await ctx.reply(`Monto`)

        return ctx.wizard.next()
    },

    // 2 - Guarda monto, escribe Pagador
    async (ctx) => {
        ctx.wizard.state.travelExpenseAmount = parseFloat(ctx.message.text)

        await ctx.reply(`Quien paga?`)

        return ctx.wizard.next()
    },

    // 3 Guarda Pagador, Pregunta tipo, crea
    async (ctx) => {
        ctx.wizard.state.actualTravelData = await getActualTravel()
        ctx.wizard.state.travelExpensePayer = ctx.message.text;

        const { expenseTypeList, expenseTypeCollection } = await getTravelExpenseType();
        ctx.wizard.state.travelExpensesCollection = expenseTypeCollection
        await ctx.reply(`Tipo de Gasto:\n${expenseTypeList}`);
        return ctx.wizard.next();
    },

    // 4 - FINAL - Guarda Tipo - Crea REGISTRO
    async (ctx) => {
        // ctx.wizard.state.travelExpenseType = 
        ctx.wizard.state.travelExpenseType = ctx.wizard.state.travelExpensesCollection[parseFloat(ctx.message.text - 1)]?.name;
        const WizardState = ctx.wizard.state
        
        properties = {
            name: WizardState?.travelExpenseName,
            type: WizardState?.travelExpenseType,
            amount: WizardState?.travelExpenseAmount,
            payer: WizardState?.travelExpensePayer,
            travelId: WizardState?.actualTravelData[0].id,
        };
        // console.log(movimientoData)
        
        await AddNewTravelExpense(ctx, properties)
        await ctx.reply('Gasto agregado')

        return ctx.scene.leave();
    }
)

session({
    property: 'chatSession',
    getSessionKey: (ctx) => ctx.chat && ctx.chat.id
})

const stage = new Stage([GASTO_DATA_WIZARD, INGRESO_DATA_WIZARD, CUOTA_DATA_WIZARD, TRAVEL_EXPENSE_WIZARD], { sessionName: 'chatSession' });

bot.use(session()); // to  be precise, session is not a must have for Scenes to work, but it sure is lonely without one
bot.use(stage.middleware());

//Configuracion inicial del bot
bot.start((ctx) => {
    // console.log(ctx.update.message.chat.id)
    // Configura opciones del teclado
    const opTecladoInicio = ['🤑 Guita', 'Opción 2', 'Opción 3', 'Opción 4']
    let keyboard = GenerarOpcionesTeclado(opTecladoInicio)
    ctx.reply('Hola kpo', keyboard);
});

// Comandos del bot
bot.command('gasto', Stage.enter('CREAR_GASTO_NUEVO'))

bot.command('ingreso', Stage.enter('CREAR_INGRESO_NUEVO'))

bot.command('cuotas', Stage.enter('CREAR_CUOTA_NUEVA'))

bot.command('viaje', Stage.enter('CREATE_TRAVEL_EXPENSE'))
// bot.command('viaje', Stage.enter('CREATE_TRAVEL_EXPENSE'))

// Escuchar opciones de texto
bot.hears('🤑 Guita', (ctx) => {
    let opTecladoGuita = ['↓ Gasto', '↑ Ingreso']
    let keyboard = GenerarOpcionesTeclado(opTecladoGuita)

    ctx.reply('Tipo de operacion', keyboard);
});

bot.hears('↓ Gasto', Stage.enter('CREAR_GASTO_NUEVO'));

bot.hears('↑ Ingreso', Stage.enter('CREAR_INGRESO_NUEVO'));

//Ayuda del bot
bot.help((ctx) => {
    ctx.reply('Yo te ayudo master, WIP')
})

bot.launch()

//Comandos Wizards
INGRESO_DATA_WIZARD.command('cancelar', (ctx) => {
    ctx.reply('Saliendo de la escena...')
    return ctx.scene.leave();
})
GASTO_DATA_WIZARD.command('cancelar', (ctx) => {
    ctx.reply('Saliendo de la escena...')
    return ctx.scene.leave();
})
CUOTA_DATA_WIZARD.command('cancelar', (ctx) => {
    ctx.reply('Saliendo de la escena...')
    return ctx.scene.leave();
})

function GenerarOpcionesTeclado(opciones) {
    var teclado = {
        reply_markup: {
            keyboard: [],
            resize_keyboard: true,
            one_time_keyboard: true,
        },
    };

    for (let i = 0; i < opciones.length; i += 2) {
        teclado.reply_markup.keyboard.push(opciones.slice(i, i + 2));
    }

    return teclado;
}

//Crea 
async function AgregarRegistroNuevo(ctx, datosIngresados) {
    ctx.reply('Agregando registro nuevo...');
    try {
        await CrearMovimientoNuevo(opcionesDB.dbFlujoPlata, datosIngresados);
        ctx.reply('Registro insertado correctamente.');
    } catch (error) {
        console.error('Error al insertar el registro:', error.message);
        ctx.reply('Ocurrió un error al insertar el registro.');
    }
}

async function AddNewTravelExpense(ctx, properties) {
    ctx.reply('Agregando registro nuevo...');
    try {
        await CreateTravelExpensePage(properties);
        ctx.reply('Registro insertado correctamente.');
    } catch (error) {
        console.error('Error al insertar el registro:', error.message);
        ctx.reply('Ocurrió un error al insertar el registro.');
    }   
}

async function getMovementTypeIndexByName(dbid, typeName) {
    try {
        // Primero, obtenemos la lista de tipos de gasto/ingreso usando la función anterior
        const { tiposGastoIngresoColeccion } = await ObtenerTipoGastoIngreso(dbid);
        
        // Buscamos el tipo que coincida con el nombre que se pasa como parámetro
        const tipoEncontrado = tiposGastoIngresoColeccion.find(tipo => tipo.tipoGastoNombre.toLowerCase() === typeName.toLowerCase());

        // Si el tipo fue encontrado, retornamos su índice
        if (tipoEncontrado) {
            return tipoEncontrado.tipoGastoIndice;
        } else {
            throw new Error(`No se encontró un tipo de gasto o ingreso con el nombre: ${typeName}`);
        }
    } catch (error) {
        console.error("Error al obtener movimiento tipo Notion:", error.message);
    }
}

function ObtenerPrimerDiaMesSiguiente(fechaString, cantidadMeses) {
    // Convertir la cadena de texto a un objeto Date
    const fecha = new Date(fechaString);

    // Calcular el mes siguiente
    const mesSiguiente = fecha.getMonth() + 1 + cantidadMeses;
    const añoSiguiente = fecha.getFullYear() + Math.floor(mesSiguiente / 12); // Calcular si hay cambio de año
    const mesSiguienteNormalizado = mesSiguiente % 12 || 12; // Normalizar el mes para que esté en el rango [1, 12]
    const primerDiaMesSiguiente = new Date(añoSiguiente, mesSiguienteNormalizado - 1, 1); // Obtener el primer día del mes siguiente

    // Formatear la fecha en el formato YYYY-MM-DD
    const fechaPrimerDiaMesSiguiente = `${primerDiaMesSiguiente.getFullYear()}-${(primerDiaMesSiguiente.getMonth() + 1).toString().padStart(2, '0')}-${primerDiaMesSiguiente.getDate().toString().padStart(2, '0')}`;

    return fechaPrimerDiaMesSiguiente;
}

function reiniciarBot(ctx) {
    // Detener el bot
    bot.stop();

    // Esperar 2 segundos antes de reiniciar
    setTimeout(() => {
        // Volver a iniciar el bot
        bot.launch();

        // Añadir cualquier lógica adicional después de reiniciar
        ctx.reply('Reinicado')
    }, 2000);
}