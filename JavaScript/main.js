const dotenv = require('dotenv').config();
const { Telegraf } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

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