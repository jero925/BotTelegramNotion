
// Estrategia base para generar teclados
class KeyboardStrategy {
    generate(options, columns) {
        throw new Error("Method 'generate()' must be implemented");
    }
}

// Estrategia para generar un reply keyboard
class ReplyKeyboardStrategy extends KeyboardStrategy {
    generate(options, columns) {
        const keyboard = {
            reply_markup: {
                keyboard: [],
                resize_keyboard: true,
                one_time_keyboard: true,
            },
        };

        for (let i = 0; i < options.length; i += columns) {
            keyboard.reply_markup.keyboard.push(options.slice(i, i + columns));
        }

        return keyboard;
    }
}

// Estrategia para generar un inline keyboard
class InlineKeyboardStrategy extends KeyboardStrategy {
    generate(options, columns) {
        const inlineKeyboard = {
            reply_markup: {
                inline_keyboard: [],
            },
        };

        for (let i = 0; i < options.length; i += columns) {
            const row = options.slice(i, i + columns).map(option => ({
                text: option.text,
                callback_data: option.callback_data,
            }));
            inlineKeyboard.reply_markup.inline_keyboard.push(row);
        }

        return inlineKeyboard;
    }
}

// Clase principal que utiliza el patrón Strategy
class CustomKeyboard {
    constructor(strategy) {
        this.strategy = strategy;
    }

    generateKeyboard(options, columns = 2) {
        return this.strategy.generate(options, columns);
    }

    static generateKeyboardFromOptions(options, columns = 2, isInline = false) {
        const strategy = isInline ? new InlineKeyboardStrategy() : new ReplyKeyboardStrategy();
        const customKeyboard = new CustomKeyboard(strategy);
        return customKeyboard.generateKeyboard(options, columns);
    }
}

export default CustomKeyboard;