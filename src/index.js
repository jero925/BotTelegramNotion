import { Telegraf, Scenes, session } from 'telegraf';

import GenerarOpcionesTeclado from './utils/generate_keyboard.js';
import INCOME_WIZARD from './scenes/wizard/income.js';
import EXPENSE_WIZARD from './scenes/wizard/outcome.js';
import INSTALLMENT_WIZARD from './scenes/wizard/installment.js';
import TRAVEL_EXPENSE_WIZARD from './scenes/wizard/travel-expense.js';
import MASSIVE_INSTALLMENTS_WIZARD from './scenes/wizard/massive_installments.js';

const { Stage } = Scenes


// Crear instancias del bot y el cliente de Notion
const bot = new Telegraf(process.env.BOT_TOKEN);

session({
    property: 'chatSession',
    getSessionKey: (ctx) => ctx.chat && ctx.chat.id
})

const stage = new Stage([
    EXPENSE_WIZARD, 
    INCOME_WIZARD,
    INSTALLMENT_WIZARD, 
    TRAVEL_EXPENSE_WIZARD,
    MASSIVE_INSTALLMENTS_WIZARD
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
bot.command('gasto', Stage.enter('CREATE_NEW_EXPENSE'))

bot.command('ingreso', Stage.enter('CREATE_NEW_INCOME'))

bot.command('cuotas', Stage.enter('CREATE_NEW_INSTALLMENT'))

bot.command('viaje', Stage.enter('CREATE_TRAVEL_EXPENSE'))

// Escuchar opciones de texto
bot.hears('🤑 Guita', (ctx) => {
    let opTecladoGuita = ['↓ Gasto', '↑ Ingreso']
    let keyboard = GenerarOpcionesTeclado(opTecladoGuita)

    ctx.reply('Tipo de operacion', keyboard);
});

bot.hears('↓ Gasto', Stage.enter('CREATE_NEW_EXPENSE'));

bot.hears('↑ Ingreso', Stage.enter('CREATE_NEW_INCOME'));

//Ayuda del bot
bot.help((ctx) => {
    ctx.reply('Yo te ayudo master, WIP')
})

bot.launch()
console.log('Bot initialized');

//Comandos Wizards
INCOME_WIZARD.command('cancelar', (ctx) => {
    ctx.reply('Saliendo de la escena...')
    return ctx.scene.leave();
})
EXPENSE_WIZARD.command('cancelar', (ctx) => {
    ctx.reply('Saliendo de la escena...')
    return ctx.scene.leave();
})
INSTALLMENT_WIZARD.command('cancelar', (ctx) => {
    ctx.reply('Saliendo de la escena...')
    return ctx.scene.leave();
})