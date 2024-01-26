//Importar Módulos
const { Client } = require('@notionhq/client');
const { Telegraf } = require('telegraf');
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

// Tipos de movimiento (Ingreso/Gasto) y sus imágenes asociadas
const opcionesMovimientoTipoIO = {
    Gasto: 'Gasto',
    Ingreso: 'Ingreso'
}

const OpcionesMovimientoImagen = {
    Ingreso: 'https://www.notion.so/icons/upward_green.svg',
    Gasto: 'https://www.notion.so/icons/downward_red.svg'
}

// Crear instancias del bot y el cliente de Notion
const bot = new Telegraf(process.env.BOT_TOKEN);
const notion = new Client({ auth: opcionesDB.apiKeyNotion });

// for (const key in opcionesDB) {
//     if (opcionesDB.hasOwnProperty(key)) {
//         console.log(`${key}: ${opcionesDB[key]}`);
//     }
// }

//Configuracion inicial del bot
bot.start((ctx) => {
    // Configura opciones del teclado
    const opTecladoInicio = ['🤑 Guita', 'Opción 2', 'Opción 3', 'Opción 4']
    let keyboard = GenerarOpcionesTeclado(opTecladoInicio)

    ctx.reply('Hola kpo', keyboard);
});

// Comandos del bot
bot.command('gasto', (ctx) => {
    CrearGastoNuevo(ctx);
})

bot.command('ingreso', (ctx) => {
    CrearIngresoNuevo(ctx);
})

// Escuchar opciones de texto
bot.hears('🤑 Guita', (ctx) => {
    let opTecladoGuita = ['↓ Gasto', '↑ Ingreso']
    let keyboard = GenerarOpcionesTeclado(opTecladoGuita)

    ctx.reply('Tipo de operacion', keyboard);
});

bot.hears('↓ Gasto', async (ctx) => {
    CrearGastoNuevo(ctx)
});

// bot.hears('Opción 3', (ctx) => {
//     ctx.reply('Seleccionaste la Opción 3, WIP');
// });

// bot.hears('Opción 4', (ctx) => {
//     ctx.reply('Seleccionaste la Opción 4, WIP');
// });

//Ayuda del bot
bot.help((ctx) => {
    ctx.reply('Yo te ayudo master, WIP')
})

// Lanzar el bot
bot.launch();

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

// Función para crear un nuevo gasto
function CrearGastoNuevo(ctx) {
    PoblarInputMovimientoNuevo(ctx, opcionesMovimientoTipoIO.Gasto, OpcionesMovimientoImagen.Gasto)
}

// Función para crear un nuevo ingreso
function CrearIngresoNuevo(ctx) {
    PoblarInputMovimientoNuevo(ctx, opcionesMovimientoTipoIO.Ingreso, OpcionesMovimientoImagen.Ingreso)
}

// Función para reiniciar el bot
function ReiniciarBot() {
    bot.stop();
    bot.launch();
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
        ReiniciarBot();
    } catch (error) {
        console.error('Error al insertar el registro:', error.message);
        ctx.reply('Ocurrió un error al insertar el registro.');
        ReiniciarBot();
    }
}

// Obtiene el mes actual desde Notion
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
                    relation: [],
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

async function PoblarInputMovimientoNuevo(ctx, movimientoTipoIO, movimientoImagen) {
    try {
        const { listaGastoTipos, tiposGastoIngresoColeccion } = await ObtenerTipoGastoIngreso(opcionesDB.dbFlujoPlata);
        ctx.reply(`Tipos de gastos:\n${listaGastoTipos}`);

        const { listaCuentasPagos, cuentasPagosColeccion } = await ObtenerCuentasPagos(opcionesDB.dbMetPago);
        ctx.reply(`Cuentas:\n${listaCuentasPagos}`);

        const movimientoMesActualId = await ObtenerMesActual(opcionesDB.dbMeses);

        ctx.reply(`Escribí estos datos:\n-Nombre del gasto\n-Monto\n-Indice del tipo de gasto\n-Indice de cuenta`);

        bot.on('text', (ctx) => {
            const inputLineasDatosMovimiento = ctx.update.message.text.split('\n');

            // Asignar cada línea a una variable
            const movimientoNombre = inputLineasDatosMovimiento[0];
            const movimientoMonto = parseFloat(inputLineasDatosMovimiento[1]);
            const movimientoTipoNombre = tiposGastoIngresoColeccion[parseInt(inputLineasDatosMovimiento[2] - 1)].tipoGastoNombre; //Le resto 1 para saber el numero real
            const movimientoCuentaId = cuentasPagosColeccion[parseInt(inputLineasDatosMovimiento[3] - 1)].cuentaId; //Le resto 1 para saber el numero real
            const movimientoFechaActual = ObtenerFechaHoy();
            // Almacena los datos en la variable
            const datosIngresados = {
                movimientoTipoIO,
                movimientoImagen,
                movimientoNombre,
                movimientoMonto,
                movimientoTipoNombre,
                movimientoCuentaId,
                movimientoFechaActual,
                movimientoMesActualId,
            };

            const inlineKeyboard = [
                [
                    { text: 'No', callback_data: 'no' },
                    { text: 'Sí', callback_data: 'si' }
                ]
            ];

            console.log(datosIngresados);

            if (movimientoTipoIO === opcionesMovimientoTipoIO.Ingreso) {
                AgregarRegistroNuevo(ctx, datosIngresados)
            } else {
                ctx.reply('Es un producto en cuotas?', { reply_markup: { inline_keyboard: inlineKeyboard } });
                bot.action('si', (ctx) => {
                    ctx.reply('Función en desarrollo...');
                });

                bot.action('no', async (ctx) => {
                    AgregarRegistroNuevo(ctx, datosIngresados)
                });
            }
        });
    } catch (error) {
        console.error("Error:", error.message);
        ctx.reply('Ocurrió un error al insertar el registro.');
    }

}
/* ============================================= TO DO =============================================
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

        const cuotasActivas = cuotasActivasObtenidas.results.map(result => ({
            cuotaId: result.id,
            cuotaNombre: result.properties.Name.title[0].text.content
        }))
        console.log(cuotasActivas);
    } catch (error) {
        console.error("Error al obtener Cuotas Activas:", error.message);
    }
};
*/