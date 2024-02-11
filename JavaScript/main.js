//Importar Módulos
const { Client } = require('@notionhq/client');
const { Telegraf, Scenes:{Stage, WizardScene}, session, Composer } = require('telegraf');
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

// const movimientoFechaActual = ObtenerFechaHoy();

const GASTO_DATA_WIZARD = new WizardScene(
    'CREAR_GASTO_NUEVO', // first argument is Scene_ID, same as for BaseScene
    // 0
    async (ctx) => {
        ctx.reply('Es un producto en cuotas?', {
            reply_markup: {
                inline_keyboard: [ [ { text: 'Si', callback_data: 'si' },  { text: 'No', callback_data: 'no' } ] ]
            }
        });
        return ctx.wizard.next();
    },
    // 1
    async (ctx) => {
        if (ctx.callbackQuery.data == undefined) {
            ctx.reply('Pusiste cualquiera, master')
            console.log('INDEFINIDO ' + ctx.wizard.cursor)
            ctx.scene.leave();
        } else if (ctx.callbackQuery.data === 'si') {
            const resultCuotas = await ObtenerCuotasActivas(opcionesDB.dbCuotas);
            cuotasActivasColeccion = resultCuotas.cuotasActivasColeccion;
            await ctx.reply(`Indices Cuotas activas:\n${resultCuotas.listaCuotasActivas}`);
            ctx.wizard.state.movimientoTipoNombre = 'Cuota';
            console.log('ES CUOTA ' + ctx.wizard.cursor)
            return ctx.wizard.next();
        } else if (ctx.callbackQuery.data === 'no') {
            ctx.reply('Nombre del gasto')

            return ctx.wizard.selectStep(4); // Aquí salta al step 4
        }

    },
    // 2 INDICE CUOTA ELEGIDO
    async (ctx) => {
        const movimientoCuotaIndice = parseInt(ctx.message.text - 1);
        const resultCuentas = await ObtenerCuentasPagos(opcionesDB.dbMetPago);

        ctx.wizard.state.movimientoCuotaId = cuotasActivasColeccion[movimientoCuotaIndice]?.cuotaId
        ctx.wizard.state.movimientoNombre = ' Cuota ' + (cuotasActivasColeccion[movimientoCuotaIndice]?.cuotasPagadas + 1) + ' ' + cuotasActivasColeccion[movimientoCuotaIndice]?.cuotaNombre;
        ctx.wizard.state.movimientoMonto = cuotasActivasColeccion[movimientoCuotaIndice]?.cuotaMonto

        cuentasPagosColeccion = resultCuentas.cuentasPagosColeccion
        await ctx.reply(`Cuentas:\n${resultCuentas.listaCuentasPagos}`);
        await ctx.reply(`Con que se paga?`)

        console.log('MOMENTO CUOTA ' + ctx.wizard.cursor)
        return ctx.wizard.selectStep(3);
    },
    // 3 FINAL - Guarda Cuenta, crea REGISTRO
    async (ctx) => {
        console.log('FINAL ' + ctx.wizard.cursor)
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
        console.log(movimientoData)
        await AgregarRegistroNuevo(ctx, movimientoData)
        return ctx.scene.leave();
    },

    // 4 - Guarda el Nombre, escribe Monto (PARA COMPARTIR CON INGRESO)
    async (ctx) => {
        ctx.wizard.state.movimientoNombre = ctx.message.text
        await ctx.reply(`Monto`)

        console.log(ctx.wizard.state.movimientoNombre)
        return ctx.wizard.next()
    },
    
    // 5 - Guarda el monto, escribe TipoMovimiento (PARA COMPARTIR CON INGRESO)
    async (ctx) => {
        ctx.wizard.state.movimientoMonto = parseFloat(ctx.message.text)
        resultTiposGasto = await ObtenerTipoGastoIngreso(opcionesDB.dbFlujoPlata);
        tiposGastoIngresoColeccion = resultTiposGasto.tiposGastoIngresoColeccion;
        await ctx.reply(`índice del Tipo de Movimiento:\n${resultTiposGasto.listaGastoTipos}`);
        console.log(ctx.wizard.state.movimientoNombre)
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
        console.log(ctx.wizard.state.movimientoTipoNombre)
        
        return ctx.wizard.selectStep(3)
    }
);




session({
    property: 'chatSession',
    getSessionKey: (ctx) => ctx.chat && ctx.chat.id
})

const stage = new Stage([GASTO_DATA_WIZARD], {sessionName: 'chatSession'});

bot.use(session()); // to  be precise, session is not a must have for Scenes to work, but it sure is lonely without one
bot.use(stage.middleware());
// stage.register(GASTO_DATA_WIZARD)




// bot.hears('hi', Stage.enter('CONTACT_DATA_WIZARD_SCENE_ID'));


//Configuracion inicial del bot
bot.start((ctx) => {
    // Configura opciones del teclado
    const opTecladoInicio = ['🤑 Guita', 'Opción 2', 'Opción 3', 'Opción 4']
    let keyboard = GenerarOpcionesTeclado(opTecladoInicio)
    // ReiniciarVariables()
    ctx.reply('Hola kpo', keyboard);
});

// Comandos del bot
bot.command('gasto', Stage.enter('CREAR_GASTO_NUEVO'))

// bot.command('reiniciar', (ctx) => {
//     ReiniciarBot()
// })

// bot.command('ingreso', (ctx) => {
//     CrearIngresoNuevo(ctx);
// })

// Escuchar opciones de texto
bot.hears('🤑 Guita', (ctx) => {
    let opTecladoGuita = ['↓ Gasto', '↑ Ingreso']
    let keyboard = GenerarOpcionesTeclado(opTecladoGuita)

    ctx.reply('Tipo de operacion', keyboard);
});

bot.hears('↓ Gasto', Stage.enter('CREAR_GASTO_NUEVO'));

//Ayuda del bot
bot.help((ctx) => {
    ctx.reply('Yo te ayudo master, WIP')
})

bot.launch()

// Función para obtener la fecha actual en formato Notion
function ObtenerFechaHoy() {
    const fechaActual = new Date();
    // const timeZone = 'America/Argentina/Buenos_Aires';  // Ajusta tu zona horaria según sea necesario

    // Obtiene componentes de la fecha
    const year = fechaActual.getFullYear();
    const month = String(fechaActual.getMonth() + 1).padStart(2, '0');  // Meses son 0-indexados, por lo que se suma 1
    const day = String(fechaActual.getDate()).padStart(2, '0');

    // Formatea la fecha para Notion (Año - Mes - Día)
    const fechaNotion = `${year}-${month}-${day}`;

    return fechaNotion;
}

// // Función para crear un nuevo gasto
// async function CrearGastoNuevo(ctx) {
//     let movimientoTipoIO = opcionesMovimientoTipoIO.Gasto
//     let movimientoImagen = OpcionesMovimientoImagen.Gasto

//     const { listaCuentasPagos, cuentasPagosColeccion } = await ObtenerCuentasPagos(opcionesDB.dbMetPago);
//     const inlineKeyboard = [
//         [
//             { text: 'No', callback_data: 'no' },
//             { text: 'Sí', callback_data: 'si' }
//         ]
//     ];
//     ctx.reply('¿Es un producto en cuotas?', { reply_markup: { inline_keyboard: inlineKeyboard } });
//     bot.action('si', async (ctx) => {
//         try {
//             // Verificar si ya se obtuvieron las cuotas activas
//             const resultCuotas = await ObtenerCuotasActivas(opcionesDB.dbCuotas);
//             cuotasActivasColeccion = resultCuotas.cuotasActivasColeccion;

//             ctx.reply(`Cuentas:\n${listaCuentasPagos}`);
//             ctx.reply(`Cuotas activas:\n${resultCuotas.listaCuotasActivas}`);
//             ctx.reply(`Escribí estos datos:\n-Indice de producto\n-Indice de cuenta`);

//             // Manejador del evento 'text'
//             const handleText = (ctx) => {
//                 if (banderaEscucharMensajesAux) {
//                     const inputLineasDatosMovimiento = ctx.update.message.text.split('\n');

//                     let movimientoCuotaIndice = parseInt(inputLineasDatosMovimiento[0] - 1);
//                     let movimientoCuentaIndice = parseInt(inputLineasDatosMovimiento[1] - 1);

//                     let movimientoCuotaId = cuotasActivasColeccion[movimientoCuotaIndice]?.cuotaId;
//                     let movimientoNombre = ' Cuota ' + (cuotasActivasColeccion[movimientoCuotaIndice]?.cuotasPagadas + 1) + ' ' + cuotasActivasColeccion[movimientoCuotaIndice]?.cuotaNombre;
//                     let movimientoMonto = cuotasActivasColeccion[movimientoCuotaIndice]?.cuotaMonto;
//                     let movimientoTipoNombre = 'Cuota'
//                     let movimientoCuentaId = cuentasPagosColeccion[movimientoCuentaIndice]?.cuentaId;

//                     datosIngresados = {
//                         movimientoTipoIO,
//                         movimientoImagen,
//                         movimientoCuotaIndice,
//                         movimientoCuotaId,
//                         movimientoNombre,
//                         movimientoMonto,
//                         movimientoTipoNombre,
//                         movimientoCuentaId,
//                         movimientoFechaActual
//                     };
//                     console.log(datosIngresados);
//                     banderaEscucharMensajesAux = false;
//                     ReiniciarVariables();
//                 }
//             };

//             // Suscribir al evento 'text'
//             bot.on('text', handleText);

//         } catch (error) {
//             console.error(error);
//             ctx.reply('Ocurrió un error al procesar la acción.');
//         }
//     });

//     bot.action('no', async (ctx) => {
//         //Me redirige a donde voy a integrar con ingreso
//         console.log('NOOOO')
//         /* ===========================================================PARA MOVER A FUNCION===========================================================*/
//         const { listaGastoTipos, tiposGastoIngresoColeccion } = await ObtenerTipoGastoIngreso(opcionesDB.dbFlujoPlata);
//         ctx.reply(`Tipos de gastos:\n${listaGastoTipos}`);

//         const { listaCuentasPagos, cuentasPagosColeccion } = await ObtenerCuentasPagos(opcionesDB.dbMetPago);
//         ctx.reply(`Cuentas:\n${listaCuentasPagos}`);

//         const movimientoMesActualId = ObtenerMesActual(opcionesDB.dbMeses);

//         if (listaGastoTipos && listaCuentasPagos && movimientoMesActualId) {
//             ctx.reply(`Escribí estos datos:\n-Nombre del gasto\n-Monto\n-Indice del tipo de gasto\n-Indice de cuenta`);
//         }
//         let datosIngresados = {}
//         // ctx.reply(`Escribí estos datos:\n-Nombre del gasto\n-Monto\n-Indice del tipo de gasto\n-Indice de cuenta`);
//         /* ===========================================================PARA MOVER A FUNCION===========================================================*/
//         datosIngresados = bot.on('text', (ctx, datosIngresados) => {
//             const inputLineasDatosMovimiento = ctx.update.message.text.split('\n');
//             // Asignar cada línea a una variable
//             movimientoNombre = inputLineasDatosMovimiento[0];
//             movimientoMonto = parseFloat(inputLineasDatosMovimiento[1]);
//             movimientoTipoIndice = parseInt(inputLineasDatosMovimiento[2] - 1);
//             movimientoCuentaIndice = parseInt(inputLineasDatosMovimiento[3] - 1);
//             movimientoFechaActual = ObtenerFechaHoy();
//             movimientoTipoNombre = tiposGastoIngresoColeccion[movimientoTipoIndice]?.tipoGastoNombre;
//             movimientoCuentaId = cuentasPagosColeccion[movimientoCuentaIndice]?.cuentaId;

//             datosIngresados = {
//                 movimientoTipoIO,
//                 movimientoImagen,
//                 movimientoNombre,
//                 movimientoMonto,
//                 movimientoTipoNombre,
//                 movimientoCuentaId,
//                 movimientoFechaActual,
//             };
//             return datosIngresados
//         })
//         console.log(datosIngresados)
//         datosIngresados = {
//             ...datosIngresados,
//             movimientoMesActualId
//         };

//         // console.log(datosIngresados);
//         // AgregarRegistroNuevo(ctx, datosIngresados);

//     });
//     // PoblarInputMovimientoNuevo(ctx, opcionesMovimientoTipoIO.Gasto, OpcionesMovimientoImagen.Gasto)
// }

// // Función para crear un nuevo ingreso
// function CrearIngresoNuevo(ctx) {
//     PoblarInputMovimientoNuevo(ctx, opcionesMovimientoTipoIO.Ingreso, OpcionesMovimientoImagen.Ingreso)
// }

// // Función para reiniciar el bot
// function ReiniciarBot() {
//     setTimeout(async () => {
//         try {
//             await bot.stop();
//             console.log('Bot detenido.');
//             await bot.launch({ polling: { timeout: 1 } });
//             console.log('Bot reiniciado.');
//         } catch (error) {
//             console.error('Error al reiniciar el bot:', error.message);
//         }
//     }, 3000);
// }


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
        // ReiniciarBot();  // Llamada para reiniciar el bot después de la creación del registro
    } catch (error) {
        console.error('Error al insertar el registro:', error.message);
        ctx.reply('Ocurrió un error al insertar el registro.');
        // ReiniciarBot();  // Llamada para reiniciar el bot en caso de error
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

// function name(params) {

// }

// async function PoblarInputMovimientoNuevo(ctx, tipoIO, movimientoImagen) {
//     ReiniciarVariables()

//     movimientoTipoIO = tipoIO;  // Asignar el tipo de movimiento globalmente
//     console.log(movimientoTipoIO);

//     try {
//         const { listaGastoTipos, tiposGastoIngresoColeccion } = ObtenerTipoGastoIngreso(opcionesDB.dbFlujoPlata);
//         ctx.reply(`Tipos de gastos:\n${listaGastoTipos}`);

//         const { listaCuentasPagos, cuentasPagosColeccion } = ObtenerCuentasPagos(opcionesDB.dbMetPago);
//         ctx.reply(`Cuentas:\n${listaCuentasPagos}`);

//         const movimientoMesActualId = ObtenerMesActual(opcionesDB.dbMeses);

//         if (listaCuentasPagos && listaGastoTipos && movimientoMesActualId) {
//             ctx.reply(`Escribí estos datos:\n-Nombre del gasto\n-Monto\n-Indice del tipo de gasto\n-Indice de cuenta`);
//         }
//         // ctx.reply(`Escribí estos datos:\n-Nombre del gasto\n-Monto\n-Indice del tipo de gasto\n-Indice de cuenta`);

//         // Utilizar una promesa para esperar a que se complete la lógica dentro del bot.on
//         bot.on('text', (ctx) => {
//             console.log(ctx)

//             if (estadoOperacion === 0) {
//                 console.log('dentro primer if ' + movimientoTipoIO)
//                 const inputLineasDatosMovimiento = ctx.update.message.text.split('\n');

//                 // Asignar cada línea a una variable
//                 movimientoNombre = inputLineasDatosMovimiento[0];
//                 movimientoMonto = parseFloat(inputLineasDatosMovimiento[1]);
//                 movimientoTipoIndice = parseInt(inputLineasDatosMovimiento[2] - 1);
//                 movimientoCuentaIndice = parseInt(inputLineasDatosMovimiento[3] - 1);
//                 movimientoFechaActual = ObtenerFechaHoy();
//                 movimientoTipoNombre = tiposGastoIngresoColeccion[movimientoTipoIndice]?.tipoGastoNombre;
//                 movimientoCuentaId = cuentasPagosColeccion[movimientoCuentaIndice]?.cuentaId;

//                 console.log(movimientoTipoIO)
//                 // Verifica si es un ingreso y configura datos
//                 if (movimientoTipoIO === opcionesMovimientoTipoIO.Ingreso) {

//                     // Verifica que los datos sean válidos
//                     if (movimientoTipoNombre && movimientoCuentaId) {
//                         datosIngresados = {
//                             movimientoTipoIO,
//                             movimientoImagen,
//                             movimientoNombre,
//                             movimientoMonto,
//                             movimientoTipoNombre,
//                             movimientoCuentaId,
//                             movimientoFechaActual,
//                             movimientoMesActualId,
//                         };

//                         // console.log(datosIngresados);
//                         AgregarRegistroNuevo(ctx, datosIngresados);
//                     } else {
//                         ctx.reply('Índices de tipo de gasto o cuenta inválidos.');
//                     }
//                 }
//                 if (movimientoTipoIO === opcionesMovimientoTipoIO.Gasto) {
//                     // Es un producto en cuotas
//                     const inlineKeyboard = [
//                         [
//                             { text: 'No', callback_data: 'no' },
//                             { text: 'Sí', callback_data: 'si' }
//                         ]
//                     ];
//                     ctx.reply('¿Es un producto en cuotas?', { reply_markup: { inline_keyboard: inlineKeyboard } });

//                     // Usa funciones asincrónicas en el manejador de acciones
//                     bot.action('si', async (ctx) => {
//                         estadoOperacion = 1;

//                         // Verificar si ya se obtuvieron las cuotas activas
//                         if (!cuotasActivasColeccion) {
//                             const resultCuotas = await ObtenerCuotasActivas(opcionesDB.dbCuotas);
//                             cuotasActivasColeccion = resultCuotas.cuotasActivasColeccion;
//                             ctx.reply(`Cuotas activas:\n${resultCuotas.listaCuotasActivas}`);
//                         }
//                     });

//                     bot.action('no', async (ctx) => {
//                         datosIngresados = {
//                             movimientoTipoIO,
//                             movimientoImagen,
//                             movimientoNombre,
//                             movimientoMonto,
//                             movimientoTipoNombre,
//                             movimientoCuentaId,
//                             movimientoFechaActual,
//                             movimientoMesActualId,
//                         };

//                         // console.log(datosIngresados);
//                         await AgregarRegistroNuevo(ctx, datosIngresados);
//                     });
//                 }
//             }

//             if (estadoOperacion === 1) {
//                 movimientoCuotaIndice = parseInt(ctx.update.message.text - 1);
//                 movimientoCuotaId = cuotasActivasColeccion[movimientoCuotaIndice]?.cuotaId;
//                 movimientoNombre = ' Cuota ' + (cuotasActivasColeccion[movimientoCuotaIndice]?.cuotasPagadas + 1) + ' ' + cuotasActivasColeccion[movimientoCuotaIndice]?.cuotaNombre;
//                 movimientoMonto = cuotasActivasColeccion[movimientoCuotaIndice]?.cuotaMonto;
//                 movimientoTipoNombre = 'Cuota'

//                 console.log(movimientoCuotaId)
//                 console.log(movimientoCuotaIndice)
//                 // Verifica que el índice de cuota sea válido
//                 if (movimientoCuotaId) {
//                     datosIngresados = {
//                         movimientoTipoIO,
//                         movimientoImagen,
//                         movimientoNombre,
//                         movimientoMonto,
//                         movimientoTipoNombre,
//                         movimientoCuentaId,
//                         movimientoFechaActual,
//                         movimientoMesActualId,
//                         movimientoCuotaId,
//                     };

//                     console.log(datosIngresados);
//                     AgregarRegistroNuevo(ctx, datosIngresados);
//                 } else {
//                     ctx.reply('Índice de cuota inválido.');
//                 }
//             }
//         });
//     } catch (error) {
//         console.error("Error:", error.message);
//         ctx.reply('Ocurrió un error al insertar el registro.');
//     }
// }

// function DesglozarLineasMovmimiento() {

// }

async function ObtenerCuotasActivas(dbid) {
    try {
        const cuotasActivasObtenidas = await notion.databases.query({
            database_id: dbid,
            filter: {
                property: "Activa",
                checkbox: {
                    equals: true
                }
            }
        });
        let contador = 0;
        // console.log(cuotasActivasObtenidas.results);

        const cuotasActivasColeccion = cuotasActivasObtenidas.results.map(result => ({
            cuotaIndice: contador += 1,
            cuotaId: result.id,
            cuotaNombre: result.properties.Name.title[0].text.content,
            cuotaMonto: result.properties['Valor Cuota num'].formula.number,
            cuotasPagadas: result.properties['Cuotas pagadas'].rollup.number
        }));

        const listaCuotasActivas = cuotasActivasColeccion.map((cuota) => `${cuota.cuotaIndice}- ${cuota.cuotaNombre} - $${cuota.cuotaMonto}`).join('\n');
        return { listaCuotasActivas, cuotasActivasColeccion };
    } catch (error) {
        console.error("Error al obtener Cuotas Activas:", error.message);
    }
}


// // bot.on('text', async (ctx) => {
// //     const inputLineasDatosMovimiento = ctx.update.message.text.split('\n');

// // // Asignar cada línea a una variable
// // const movimientoNombre = inputLineasDatosMovimiento[0];
// // const movimientoMonto = parseFloat(inputLineasDatosMovimiento[1]);
// // const movimientoTipoIndice = parseInt(inputLineasDatosMovimiento[2] - 1);
// // const movimientoCuentaIndice = parseInt(inputLineasDatosMovimiento[3] - 1);
// // const movimientoFechaActual = ObtenerFechaHoy();

// // // Verifica si es un ingreso y configura datos
// // if (movimientoTipoIO === opcionesMovimientoTipoIO.Ingreso) {
// //     const movimientoTipoNombre = tiposGastoIngresoColeccion[movimientoTipoIndice]?.tipoGastoNombre;
// //     const movimientoCuentaId = cuentasPagosColeccion[movimientoCuentaIndice]?.cuentaId;

// //     // Verifica que los datos sean válidos
// //     if (movimientoTipoNombre && movimientoCuentaId) {
// // const datosIngresados = {
// //     movimientoTipoIO,
// //     movimientoImagen,
// //     movimientoNombre,
// //     movimientoMonto,
// //     movimientoTipoNombre,
// //     movimientoCuentaId,
// //     movimientoFechaActual,
// //     movimientoMesActualId,
// // };

// // console.log(datosIngresados);
// // await AgregarRegistroNuevo(ctx, datosIngresados);
// //     } else {
// //         ctx.reply('Índices de tipo de gasto o cuenta inválidos.');
// //     }
// //     } else {
// //         // Es un producto en cuotas
// //         const inlineKeyboard = [
// //             [
// //                 { text: 'No', callback_data: 'no' },
// //                 { text: 'Sí', callback_data: 'si' }
// //             ]
// //         ];
// //         ctx.reply('¿Es un producto en cuotas?', { reply_markup: { inline_keyboard: inlineKeyboard } });
// //         // Usa funciones asincrónicas en el manejador de acciones
// //         bot.action('si', async (ctx) => {
// //             const { listaCuotasActivas, cuotasActivasColeccion } = await ObtenerCuotasActivas(opcionesDB.dbCuotas);
// //             ctx.reply(`Cuotas activas:\n${listaCuotasActivas}`);

// //             // Maneja la respuesta del usuario para el índice de cuota
// //             bot.on('text', (ctx) => {
// //                 console.log(ctx)
// //                 const movimientoCuotaIndice = parseInt(ctx.update.message.text - 1);
// //                 const movimientoCuotaId = cuotasActivasColeccion[movimientoCuotaIndice]?.cuotaId;

// //                 // Verifica que el índice de cuota sea válido
// //                 if (movimientoCuotaId) {
// //                     const datosIngresados = {
// //                         ...datosIngresados,
// //                         movimientoCuotaId,
// //                     };

// //                     console.log(datosIngresados);
// //                     AgregarRegistroNuevo(ctx, datosIngresados);
// //                 } else {
// //                     ctx.reply('Índice de cuota inválido.');
// //                 }
// //             });
// //         });

// //         bot.action('no', async (ctx) => {
// //             const datosIngresados = {
// //                 movimientoTipoIO,
// //                 movimientoImagen,
// //                 movimientoNombre,
// //                 movimientoMonto,
// //                 movimientoTipoNombre,
// //                 movimientoCuentaId,
// //                 movimientoFechaActual,
// //                 movimientoMesActualId,
// //             };

// //             console.log(datosIngresados);
// //             await AgregarRegistroNuevo(ctx, datosIngresados);
// //         });
// //     }
// // });





// /*
//                     const { listaCuotasActivas, cuotasActivasColeccion } = await ObtenerCuotasActivas(opcionesDB.dbCuotas);
//                     ctx.reply(`Cuotas activas:\n${listaCuotasActivas}`);

//                     // Maneja la respuesta del usuario para el índice de cuota
//                     bot.on('text', (ctx) => {
                        
//                         console.log(ctx)
//                         const movimientoCuotaIndice = parseInt(ctx.update.message.text - 1);
//                         const movimientoCuotaId = cuotasActivasColeccion[movimientoCuotaIndice]?.cuotaId;

//                         // Verifica que el índice de cuota sea válido
//                         if (movimientoCuotaId) {
//                             const datosIngresados = {
//                                 ...datosIngresados,
//                                 movimientoCuotaId,
//                             };

//                             console.log(datosIngresados);
//                             AgregarRegistroNuevo(ctx, datosIngresados);
//                         } else {
//                             ctx.reply('Índice de cuota inválido.');
//                         }
//                     });

// */