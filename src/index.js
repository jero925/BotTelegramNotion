import { Telegraf, Scenes, session } from 'telegraf';
import CustomKeyboard from './class/keyboard.js';
import INCOME_WIZARD from './scenes/wizard/income.js';
import EXPENSE_WIZARD from './scenes/wizard/expense.js';
import INSTALLMENT_WIZARD from './scenes/wizard/installment.js';
import TRAVEL_EXPENSE_WIZARD from './scenes/wizard/travel-expense.js';
import MASSIVE_INSTALLMENTS_WIZARD from './scenes/wizard/massive_installments.js';
import SUBSCRIPTION_WIZARD from './scenes/wizard/subscription.js';

const { Stage } = Scenes;

// Constants for better readability
const START_KEYBOARD_OPTIONS = ['🤑 Guita', 'Opción 2', 'Opción 3', 'Opción 4'];
const MONEY_KEYBOARD_OPTIONS = ['↓ Gasto', '↑ Ingreso'];
const COMMANDS = {
    EXPENSE: 'gasto',
    INCOME: 'ingreso',
    INSTALLMENT: 'cuotas',
    SUBSCRIPTION: 'suscripcion',
    TRAVEL: 'viaje',
    HELP: 'help'
};
const WIZARD_SCENES = {
    EXPENSE: 'CREATE_NEW_EXPENSE',
    INCOME: 'CREATE_NEW_INCOME',
    INSTALLMENT: 'CREATE_NEW_INSTALLMENT',
    TRAVEL_EXPENSE: 'CREATE_TRAVEL_EXPENSE',
    MASSIVE_INSTALLMENTS: 'MASSIVE_INSTALLMENTS',
    SUBSCRIPTION: 'SUBSCRIPTION'
};

// Define the bot's custom commands
const BOT_COMMANDS = [
    { command: COMMANDS.EXPENSE, description: 'Register a new expense' },
    { command: COMMANDS.INCOME, description: 'Register a new income' },
    { command: COMMANDS.INSTALLMENT, description: 'Register a new installment' },
    { command: COMMANDS.TRAVEL, description: 'Register a travel expense' },
    { command: COMMANDS.HELP, description: 'Get help about the bot' },
    { command: COMMANDS.SUBSCRIPTION, description: 'Pay or create a subscription' }
];

// Create bot instance
const bot = new Telegraf(process.env.BOT_TOKEN);

// Session configuration
session({
    property: 'chatSession',
    getSessionKey: (ctx) => ctx.chat && ctx.chat.id
});

// Scenes configuration
const WIZARDS = [INCOME_WIZARD, EXPENSE_WIZARD, INSTALLMENT_WIZARD, TRAVEL_EXPENSE_WIZARD, MASSIVE_INSTALLMENTS_WIZARD, SUBSCRIPTION_WIZARD];
const stage = new Stage(WIZARDS, { sessionName: 'chatSession' });

// Middleware
bot.use(session());
bot.use(stage.middleware());

// Set custom commands for the bot
bot.telegram.setMyCommands(BOT_COMMANDS);

// Start command
bot.start((ctx) => {
    const keyboard = CustomKeyboard.generateKeyboardFromOptions(START_KEYBOARD_OPTIONS, 4);
    ctx.reply('Hola kpo', keyboard);
});

// Commands
bot.command(COMMANDS.EXPENSE, Stage.enter(WIZARD_SCENES.EXPENSE));
bot.command(COMMANDS.INCOME, Stage.enter(WIZARD_SCENES.INCOME));
bot.command(COMMANDS.INSTALLMENT, Stage.enter(WIZARD_SCENES.INSTALLMENT));
bot.command(COMMANDS.TRAVEL, Stage.enter(WIZARD_SCENES.TRAVEL_EXPENSE));
bot.command(COMMANDS.SUBSCRIPTION, Stage.enter(WIZARD_SCENES.SUBSCRIPTION));


// Hears
bot.hears(START_KEYBOARD_OPTIONS[0], (ctx) => {
    const keyboard = CustomKeyboard.generateKeyboardFromOptions(MONEY_KEYBOARD_OPTIONS);
    ctx.reply('Tipo de operacion', keyboard);
});

bot.hears(MONEY_KEYBOARD_OPTIONS[0], Stage.enter(WIZARD_SCENES.EXPENSE));
bot.hears(MONEY_KEYBOARD_OPTIONS[1], Stage.enter(WIZARD_SCENES.INCOME));

// Help command
bot.help((ctx) => {
    ctx.reply('Yo te ayudo master, WIP');
});

// Cancel command for all wizards
WIZARDS.forEach(wizard => {
    wizard.command('cancelar', (ctx) => {
        ctx.reply('Saliendo de la escena...');
        return ctx.scene.leave();
    });
});

// Launch the bot
bot.launch();
console.log('Bot initialized');