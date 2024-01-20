const { Client } = require('@notionhq/client');
const { Telegraf } = require('telegraf');
const dotenv = require('dotenv').config();

const opcionesDB = {
    apiKeyNotion: process.env.NOTION_API_KEY,

    dbCalendario: process.env.CALENDARIO_DB_ID,
    dbMetPago: process.env.MET_PAGO_DB_ID,
    dbMeses: process.env.MESES_DB_ID,
    dbFlujoPlata: process.env.FLUJOPLATA_DB_ID,
    dbCuotas: process.env.CUOTAS_DB_ID
}

const bot = new Telegraf(process.env.BOT_TOKEN);
const notion = new Client({ auth: opcionesDB['apiKeyNotion'] });

// for (const key in opcionesDB) {
//     if (opcionesDB.hasOwnProperty(key)) {
//         console.log(`${key}: ${opcionesDB[key]}`);
//     }
// }


bot.start((ctx) => {
    // Configuramos las opciones del teclado
    let opcionesTeclado = ['🤑 Guita', 'Opción 2', 'Opción 3', 'Opción 4']
    let keyboard = GenerarOpcionesTeclado(opcionesTeclado)

    ctx.reply('Hola kpo', keyboard);
});
bot.hears('🤑 Guita', (ctx) => {
    let opcionesTeclado = ['↓ Gasto', '↑ Ingreso']
    let keyboard = GenerarOpcionesTeclado(opcionesTeclado)

    ctx.reply('Tipo de operacion', keyboard);
});

bot.hears('↓ Gasto', (ctx) => {
    //LOGICA DE NOTION
    ctx.reply('Seleccionaste la Opción 2');
});

bot.hears('Opción 3', (ctx) => {
    ctx.reply('Seleccionaste la Opción 3');
});

bot.hears('Opción 4', (ctx) => {
    ctx.reply('Seleccionaste la Opción 4');
});

bot.help((ctx) => {
    ctx.reply('Yo te ayudo master')
})

bot.launch();

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

        console.log(mesActual.results[0].id);
        console.log(mesActual.results[0].properties.Mes.title[0].text.content);

    } catch (error) {
        console.error("Error al obtener el mes actual desde Notion:", error.message);
    }
}

async function ObtenerCuentasPagos(dbid) {
    //dbid => dbMetPago
    try {
        const cuentasPagosObtenidas = await notion.databases.query({ database_id: dbid });

        const cuentasPagos = cuentasPagosObtenidas.results.map(result => ({
            id: result.id,
            nombre: result.properties.Name.title[0].text.content
        }));

        return { cuentasPagos }
    } catch (error) {
        console.error("Error al obtener cuentas de pago Notion:", error.message);
        throw error; // Propaga el error para manejarlo en la parte que llama a la función
    }
};

async function ObtenerTipoGastoIngreso(dbid) {
    try {
        const respuesta = await notion.databases.retrieve({ database_id: dbid });
        // console.log(respuesta)
        const tiposGastoIngreso = respuesta.properties.Tipo.multi_select.options.map(result => ({
            tipoGastoId: result.id,
            tipoGastoNombre: result.name
        }));
        console.log(tiposGastoIngreso);
    } catch (error) {
        console.error("Error al obtener movimiento tipo Notion:", error.message);
    }
};

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
        // console.log(mesActual.results[0].properties.Mes.title[0].text.content);
    } catch (error) {
        console.error("Error al obtener Cuotas Activas:", error.message);
    }
};