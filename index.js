//Importar Módulos
const { Client } = require('@notionhq/client');
const { Telegraf, Scenes: { Stage, WizardScene }, session, Composer } = require('telegraf');
const dotenv = require('dotenv').config();

// Configuración de la base de datos y opciones
const opcionesDB = {
    apiKeyNotion: process.env.NOTION_API_KEY,
    dbCalendario: process.env.CALENDARIO_DB_ID,
    dbMetPago: process.env.MET_PAGO_DB_ID,
    dbMeses: process.env.MESES_DB_ID,
    dbFlujoPlata: process.env.FLUJOPLATA_DB_ID,
    dbCuotas: process.env.CUOTAS_DB_ID
}
// for (const key in opcionesDB) {
//     if (opcionesDB.hasOwnProperty(key)) {
//         console.log(`${key}: ${opcionesDB[key]}`);
//     }
// }

// Crear instancias del bot y el cliente de Notion
const bot = new Telegraf(process.env.BOT_TOKEN);
const notion = new Client({ auth: opcionesDB.apiKeyNotion });

// Tipos de movimiento (Ingreso/Gasto) y sus imágenes asociadas
const opcionesMovimientoTipoIO = {
    Gasto: 'Gasto',
    Ingreso: 'Ingreso'
}

const opcionesMovimientoImagen = {
    Ingreso: 'https://www.notion.so/icons/upward_green.svg',
    Gasto: 'https://www.notion.so/icons/downward_red.svg'
}

const cuotaImagen = 'https://www.notion.so/icons/credit-card_gray.svg'

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



session({
    property: 'chatSession',
    getSessionKey: (ctx) => ctx.chat && ctx.chat.id
})

const stage = new Stage([GASTO_DATA_WIZARD, INGRESO_DATA_WIZARD, CUOTA_DATA_WIZARD], { sessionName: 'chatSession' });

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

// Función para obtener la fecha actual en formato Notion
function ObtenerFechaHoy() {
    const fechaActual = new Date();

    // Obtiene componentes de la fecha
    fechaNotion = formatearFecha(fechaActual)
    return fechaNotion
}

function formatearFecha(fechaString) {
    const fecha = new Date(fechaString)
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');  // Meses son 0-indexados, por lo que se suma 1
    const day = String(fecha.getDate()).padStart(2, '0');

    // Formatea la fecha para Notion (Año - Mes - Día)
    const fechaFormateada = `${year}-${month}-${day}`;

    return fechaFormateada;

}

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


// // Obtiene el mes actual desde Notion
async function ObtenerMesActual(dbid) {
    //dbid => dbMeses
    try {
        const mesActual = await notion.databases.query({
            database_id: dbid,
            filter: {
                and: [
                    {
                        property: "Actual",
                        checkbox: {
                            equals: true
                        }
                    }
                ]
            }
        });
        const mesActualId = mesActual.results[0].id
        return mesActualId

    } catch (error) {
        console.error("Error al obtener el mes actual desde Notion:", error.message);
    }
}

async function ObtenerCuentasPagos(dbid) {
    //dbid => dbMetPago
    try {
        const cuentasPagosObtenidas = await notion.databases.query({ database_id: dbid });
        let contador = 0
        const cuentasPagosColeccion = cuentasPagosObtenidas.results.map(result => ({
            cuentaIndice: contador += 1,
            cuentaId: result.id,
            cuentaNombre: result.properties.Name.title[0].text.content
        }));

        const listaCuentasPagos = cuentasPagosColeccion.map((cuenta) => `${cuenta.cuentaIndice}- ${cuenta.cuentaNombre}`).join('\n')
        return { listaCuentasPagos, cuentasPagosColeccion }
    } catch (error) {
        console.error("Error al obtener cuentas de pago Notion:", error.message);
        throw error;
    }
};

async function ObtenerTipoGastoIngreso(dbid) {
    try {
        const respuesta = await notion.databases.retrieve({ database_id: dbid });
        let contador = 0
        const tiposGastoIngresoColeccion = respuesta.properties.Tipo.multi_select.options.map(result => ({
            tipoGastoIndice: contador += 1,
            tipoGastoId: result.id,
            tipoGastoNombre: result.name
        }));
        const listaGastoTipos = tiposGastoIngresoColeccion.map((tipo) => `${tipo.tipoGastoIndice}- ${tipo.tipoGastoNombre}`).join('\n');
        return { listaGastoTipos, tiposGastoIngresoColeccion }
    } catch (error) {
        console.error("Error al obtener movimiento tipo Notion:", error.message);
    }
};

async function CrearMovimientoNuevo(dbid, datos) {
    try {
        const movimientoNuevo = await notion.pages.create({
            icon: {
                type: "external",
                external: {
                    url: datos.movimientoImagen//"https:/ / www.notion.so / icons / downward_red.svg" //reemplazado por variable dependiendo gasto o ingreso va a ir un icono u otro
                }
            },
            parent: {
                database_id: dbid
            },
            properties: {
                Fecha: {
                    type: "date",
                    date: {
                        start: datos.movimientoFechaActual //Tiene que ir la fecha de hoy
                    }
                },
                "Producto en cuotas": {
                    type: "relation",
                    relation: datos.movimientoCuotaId ? [{ id: datos.movimientoCuotaId }] : [],
                    has_more: false
                },
                Cuenta: {
                    type: "relation",
                    relation: [
                        {
                            id: datos.movimientoCuentaId
                        }
                    ],
                    has_more: false
                },
                Tipo: {
                    type: "multi_select",
                    multi_select: [
                        {
                            name: datos.movimientoTipoNombre
                        }//,
                        // {
                        //     name: "Social"
                        // }
                    ]
                },
                Suscripcion: {
                    type: "relation",
                    relation: [],
                    has_more: false
                },
                "I/O": {
                    type: "select",
                    select: {
                        name: datos.movimientoTipoIO
                    }
                },
                "Estado Suscripcion": {
                    type: "status",
                    status: {
                        name: "No sub"
                    }
                },
                "Ingreso. Mes Año": {
                    type: "relation",
                    relation: datos.movimientoTipoIO === opcionesMovimientoTipoIO.Ingreso ? [
                        {
                            id: datos.movimientoMesActualId
                        }
                    ] : [],
                    has_more: false
                },
                Monto: {
                    type: "number",
                    number: datos.movimientoTipoIO === opcionesMovimientoTipoIO.Gasto ? -datos.movimientoMonto : datos.movimientoMonto
                },
                "Gasto. Mes Año": {
                    type: "relation",
                    relation: datos.movimientoTipoIO === opcionesMovimientoTipoIO.Gasto ? [
                        {
                            id: datos.movimientoMesActualId
                        }
                    ] : [],
                    has_more: false
                },
                Nombre: {
                    id: "title",
                    type: "title",
                    title: [
                        {
                            type: "text",
                            text: {
                                content: datos.movimientoNombre
                            }
                        }
                    ]
                }
            }
        })
    } catch (error) {
        console.error('Error al insertar el registro:', error.message);
    }
}

async function CrearPaginaCuotaNueva(dbid, datosCuota) {
    try {
        // const mesesRelacionados = datosCuota.cuotaMeses.map(mes => ({ id: mes.mesId })); //PARA AGREGAR ANTES
        const cuotaNueva = await notion.pages.create({
            icon: {
                type: "external",
                external: {
                    url: datosCuota.cuotaImagen //https://www.notion.so/icons/credit-card_gray.svg
                }
            },
            parent: {
                database_id: dbid
            },
            properties: {
                "Monto Total": {
                    type: "number",
                    number: datosCuota.cuotaMonto
                },
                "Cantidad de cuotas": {
                    type: "select",
                    select: {
                        name: datosCuota.cuotaCantidadCuotas
                    }
                },
                /* Por el momento no necesario
                "Monto Regalado": {
                    type: "number",
                    number: null
                },
                */
                "Primer cuota": {
                    type: "date",
                    date: {
                        start: datosCuota.cuotaFechaPrimerCuota
                    }
                },
                "Fecha de compra": {
                    type: "date",
                    date: {
                        start: datosCuota.cuotaFechaActual
                    }
                },
                Meses: {
                    type: "relation",
                    relation: datosCuota.cuotaMeses
                },
                Name: {
                    id: "title",
                    type: "title",
                    title: [
                        {
                            type: "text",
                            text: {
                                content: datosCuota.cuotaNombre
                            }
                        }
                    ]
                }
            }
        })
    } catch (error) {
        console.error('Error al insertar el nuevo producto en cuotas:', error.message);
    }
}

async function ObtenerCuotasActivas(dbid) {
    today = new Date().toISOString();
    try {
        const cuotasActivasObtenidas = await notion.databases.query({
            database_id: dbid,
            filter: {
                "and": [
                    {
                        property: "Activa",
                        checkbox: {
                            equals: true
                        }
                    },
                    {
                        property: "Pagada Mes Actual",
                        checkbox: {
                            equals: false
                        }
                    },
                    {
                        property: "Primer cuota",
                        date: {
                            before: today
                        }
                    }
                ]
            }
        });
        let contador = 0;

        let cuotasActivasColeccion = []; // Inicializar como un arreglo vacío
        cuotasActivasColeccion.push({ // Agregar el primer elemento
            cuotaIndice: 0,
            cuotaNombre: 'Nueva Cuota'
        });
        cuotasActivasColeccion = cuotasActivasColeccion.concat(
            cuotasActivasObtenidas.results.map(result => ({
                cuotaIndice: contador += 1,
                cuotaId: result.id,
                cuotaNombre: result.properties.Name.title[0].text.content,
                cuotaMonto: result.properties['Valor Cuota num'].formula.number,
                cuotasPagadas: result.properties['Cuotas pagadas'].rollup.number,
                coutasCountCuotasPagadas: result.properties['Count Cuotas Pagadas'].formula.string
            }))
        );
        // console.log(cuotasActivasColeccion)
        const listaCuotasActivas = cuotasActivasColeccion.map((cuota) => `${cuota.cuotaIndice} - ${cuota.cuotaNombre} ${cuota.cuotaMonto !== undefined ? `- $${cuota.cuotaMonto}` : ''} ${cuota.coutasCountCuotasPagadas !== undefined ? `- ${cuota.coutasCountCuotasPagadas}` : ''}`).join('\n');

        return { listaCuotasActivas, cuotasActivasColeccion };
    } catch (error) {
        console.error("Error al obtener Cuotas Activas:", error.message);
    }
}

async function ObtenerMesesEnRangoFecha(dbid, fechaInicio, fechaFin) {
    try {
        const mesesObtenidos = await notion.databases.query({
            database_id: dbid,
            filter: {
                and: [
                    {
                        property: "Date",
                        date: {
                            on_or_after: fechaInicio
                        }
                    },
                    {
                        property: "Date",
                        date: {
                            on_or_before: fechaFin
                        }
                    }
                ]
            },
            sorts: [
                {
                    property: "Date",
                    direction: "ascending"
                }
            ]
        });
        const RangoMesesColeccion = mesesObtenidos.results.map(result => ({
            id: result.id,
        }));

        return RangoMesesColeccion
    } catch (error) {
        console.error("Error al obtener el rango de meses esperado:", error.message);
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
    console.log('esta entrando aca')
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