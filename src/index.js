import { Telegraf, Scenes, session } from 'telegraf';

import GenerarOpcionesTeclado from './utils/generate_keyboard.js';
import INGRESO_DATA_WIZARD from './scenes/wizard/income.js';
import GASTO_DATA_WIZARD from './scenes/wizard/outcome.js';
import CUOTA_DATA_WIZARD from './scenes/wizard/payments.js';
import TRAVEL_EXPENSE_WIZARD from './scenes/wizard/travel.js';
import MASSIVE_PAYMENTS_WIZARD from './scenes/wizard/massive_payments.js';

const { Stage } = Scenes


// Crear instancias del bot y el cliente de Notion
const bot = new Telegraf(process.env.BOT_TOKEN);

session({
    property: 'chatSession',
    getSessionKey: (ctx) => ctx.chat && ctx.chat.id
})

const stage = new Stage([
    GASTO_DATA_WIZARD, 
    INGRESO_DATA_WIZARD, 
    CUOTA_DATA_WIZARD, 
    TRAVEL_EXPENSE_WIZARD,
    MASSIVE_PAYMENTS_WIZARD,
], { sessionName: 'chatSession' });

bot.use(session()); // to  be precise, session is not a must have for Scenes to work, but it sure is lonely without one
bot.use(stage.middleware());

//Configuracion inicial del bot
bot.start((ctx) => {
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