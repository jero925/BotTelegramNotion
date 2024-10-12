const { Telegraf, Scenes: { Stage }, session } = require('telegraf');

const GenerarOpcionesTeclado = require('./utils/generate_keyboard.js')
const INGRESO_DATA_WIZARD = require('./scenes/wizard/income.js')
const GASTO_DATA_WIZARD = require('./scenes/wizard/outcome.js')
const CUOTA_DATA_WIZARD = require('./scenes/wizard/payments.js')
const TRAVEL_EXPENSE_WIZARD = require('./scenes/wizard/travel.js')

// Crear instancias del bot y el cliente de Notion
const bot = new Telegraf(process.env.BOT_TOKEN);

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

// async function getMovementTypeIndexByName(dbid, typeName) {
//     try {
//         // Primero, obtenemos la lista de tipos de gasto/ingreso usando la función anterior
//         const { tiposGastoIngresoColeccion } = await ObtenerTipoGastoIngreso(dbid);
        
//         // Buscamos el tipo que coincida con el nombre que se pasa como parámetro
//         const tipoEncontrado = tiposGastoIngresoColeccion.find(tipo => tipo.tipoGastoNombre.toLowerCase() === typeName.toLowerCase());

//         // Si el tipo fue encontrado, retornamos su índice
//         if (tipoEncontrado) {
//             return tipoEncontrado.tipoGastoIndice;
//         } else {
//             throw new Error(`No se encontró un tipo de gasto o ingreso con el nombre: ${typeName}`);
//         }
//     } catch (error) {
//         console.error("Error al obtener movimiento tipo Notion:", error.message);
//     }
// }

// function reiniciarBot(ctx) {
//     // Detener el bot
//     bot.stop();

//     // Esperar 2 segundos antes de reiniciar
//     setTimeout(() => {
//         // Volver a iniciar el bot
//         bot.launch();

//         // Añadir cualquier lógica adicional después de reiniciar
//         ctx.reply('Reinicado')
//     }, 2000);
// }