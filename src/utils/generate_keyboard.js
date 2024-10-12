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

module.exports = GenerarOpcionesTeclado;