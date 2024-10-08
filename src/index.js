//Importar Módulos
const { Client } = require('@notionhq/client');
const { Telegraf, Scenes: { Stage, WizardScene }, session, Composer } = require('telegraf');

const opcionesDB = require('../config/databases.js');
const { opcionesMovimientoTipoIO, opcionesMovimientoImagen, cuotaImagen } = require('../config/movements.js')
const ObtenerFechaHoy = require('./utils/dates.js')
const ObtenerMesActual = require('./notion/month.js')
const GASTO_DATA_WIZARD = require('./scenes/wizard/outcome.js')
const INGRESO_DATA_WIZARD = require('./scenes/wizard/income.js')
const CUOTA_DATA_WIZARD = require('./scenes/wizard/due.js')
const TRAVEL_EXPENSE_WIZARD = require('./scenes/wizard/travel-expense.js')

// Crear instancias del bot y el cliente de Notion
const bot = new Telegraf(process.env.BOT_TOKEN);
const notion = new Client({ auth: opcionesDB.apiKeyNotion });

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
    } catch (error) {
        console.error('Error al insertar el registro:', error.message);
        ctx.reply('Ocurrió un error al insertar el registro.');
    }
}

async function AddNewTravelExpense(ctx, properties) {
    ctx.reply('Agregando registro nuevo...');
    try {
        await CreateTravelExpensePage(properties);
        ctx.reply('Registro insertado correctamente.');
    } catch (error) {
        console.error('Error al insertar el registro:', error.message);
        ctx.reply('Ocurrió un error al insertar el registro.');
    }   
}

async function ObtenerCuentasPagos(dbid) {
    try {
        const cuentasPagosObtenidas = await notion.databases.query({ 
            database_id: dbid,
            filter:
            {
                property: "Tipo",
                select: {
                    equals: "Cuenta"
                }
            }
        });
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

async function getTravelExpenseType() {
    try {
       const { properties } = await notion.databases.retrieve({ database_id: opcionesDB.dbGastosViaje });
       let contador = 0
       const expenseTypeCollection = properties.Tipo.multi_select.options.map(type => ({
        index: contador += 1,
        id: type.id,
        name: type.name
    }));
    
    const expenseTypeList = expenseTypeCollection.map((type) => `${type.index}- ${type.name}`).join('\n')
    return { expenseTypeList, expenseTypeCollection }

    } catch (error) {
        
    }
    
}

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

async function getMovementTypeIndexByName(dbid, typeName) {
    try {
        // Primero, obtenemos la lista de tipos de gasto/ingreso usando la función anterior
        const { tiposGastoIngresoColeccion } = await ObtenerTipoGastoIngreso(dbid);
        
        // Buscamos el tipo que coincida con el nombre que se pasa como parámetro
        const tipoEncontrado = tiposGastoIngresoColeccion.find(tipo => tipo.tipoGastoNombre.toLowerCase() === typeName.toLowerCase());

        // Si el tipo fue encontrado, retornamos su índice
        if (tipoEncontrado) {
            return tipoEncontrado.tipoGastoIndice;
        } else {
            throw new Error(`No se encontró un tipo de gasto o ingreso con el nombre: ${typeName}`);
        }
    } catch (error) {
        console.error("Error al obtener movimiento tipo Notion:", error.message);
    }
}

async function getActualTravel() {
    try {
        const { results } = await notion.databases.query({
            database_id: opcionesDB.dbViaje,
            filter:
            {
                property: "Actual",
                checkbox: {
                    equals: true
                }
            }
        });
        
        return results
    } catch (error) {

    }
}

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

async function CreateTravelExpensePage(properties) {
    try {
        const movimientoNuevo = await notion.pages.create({
            parent: {
                database_id: opcionesDB.dbGastosViaje
            },
            properties: {
                Tipo: {
                    type: "multi_select",
                    multi_select: [
                        {
                            name: properties.type
                        }
                    ]
                },
                Pagador: {
                    type: "select",
                    select: {
                        name: properties.payer
                    }
                },
                Monto: {
                    type: "number",
                    number: properties.amount
                },
                Viaje: {
                    type: "relation",
                    relation: [
                        {
                            id: properties.travelId
                        }
                    ],
                    has_more: false
                },
                Nombre: {
                    id: "title",
                    type: "title",
                    title: [
                        {
                            type: "text",
                            text: {
                                content: properties.name
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


async function CrearPaginaCuotaNueva(dbid, datosCuota) {
    try {
        // const mesesRelacionados = datosCuota.cuotaMeses.map(mes => ({ id: mes.mesId })); //PARA AGREGAR ANTES
        const cuotaNueva = await notion.pages.create({
            icon: {
                type: "external",
                external: {
                    url: datosCuota.cuotaImagen //https://www.notion.so/icons/credit-card_gray.svg
                }
            },
            parent: {
                database_id: dbid
            },
            properties: {
                "Monto Total": {
                    type: "number",
                    number: datosCuota.cuotaMonto
                },
                "Cantidad de cuotas": {
                    type: "select",
                    select: {
                        name: datosCuota.cuotaCantidadCuotas
                    }
                },
                /* Por el momento no necesario
                "Monto Regalado": {
                    type: "number",
                    number: null
                },
                */
                "Primer cuota": {
                    type: "date",
                    date: {
                        start: datosCuota.cuotaFechaPrimerCuota
                    }
                },
                "Fecha de compra": {
                    type: "date",
                    date: {
                        start: datosCuota.cuotaFechaActual
                    }
                },
                Meses: {
                    type: "relation",
                    relation: datosCuota.cuotaMeses
                },
                Name: {
                    id: "title",
                    type: "title",
                    title: [
                        {
                            type: "text",
                            text: {
                                content: datosCuota.cuotaNombre
                            }
                        }
                    ]
                }
            }
        })
    } catch (error) {
        console.error('Error al insertar el nuevo producto en cuotas:', error.message);
    }
}

async function ObtenerCuotasActivas(dbid) {
    today = new Date().toISOString();
    try {
        const cuotasActivasObtenidas = await notion.databases.query({
            database_id: dbid,
            filter: {
                "and": [
                    {
                        property: "Activa",
                        checkbox: {
                            equals: true
                        }
                    },
                    {
                        property: "Pagada Mes Actual",
                        checkbox: {
                            equals: false
                        }
                    },
                    {
                        property: "Primer cuota",
                        date: {
                            before: today
                        }
                    }
                ]
            }
        });
        let contador = 0;

        let cuotasActivasColeccion = []; // Inicializar como un arreglo vacío
        cuotasActivasColeccion.push({ // Agregar el primer elemento
            cuotaIndice: 0,
            cuotaNombre: 'Nueva Cuota'
        });
        cuotasActivasColeccion = cuotasActivasColeccion.concat(
            cuotasActivasObtenidas.results.map(result => ({
                cuotaIndice: contador += 1,
                cuotaId: result.id,
                cuotaNombre: result.properties.Name.title[0].text.content,
                cuotaMonto: result.properties['Valor Cuota num'].formula.number,
                cuotasPagadas: result.properties['Cuotas pagadas'].rollup.number,
                coutasCountCuotasPagadas: result.properties['Count Cuotas Pagadas'].formula.string
            }))
        );
        // console.log(cuotasActivasColeccion)
        const listaCuotasActivas = cuotasActivasColeccion.map((cuota) => `${cuota.cuotaIndice} - ${cuota.cuotaNombre} ${cuota.cuotaMonto !== undefined ? `- $${cuota.cuotaMonto}` : ''} ${cuota.coutasCountCuotasPagadas !== undefined ? `- ${cuota.coutasCountCuotasPagadas}` : ''}`).join('\n');

        return { listaCuotasActivas, cuotasActivasColeccion };
    } catch (error) {
        console.error("Error al obtener Cuotas Activas:", error.message);
    }
}

async function ObtenerMesesEnRangoFecha(dbid, fechaInicio, fechaFin) {
    try {
        const mesesObtenidos = await notion.databases.query({
            database_id: dbid,
            filter: {
                and: [
                    {
                        property: "Date",
                        date: {
                            on_or_after: fechaInicio
                        }
                    },
                    {
                        property: "Date",
                        date: {
                            on_or_before: fechaFin
                        }
                    }
                ]
            },
            sorts: [
                {
                    property: "Date",
                    direction: "ascending"
                }
            ]
        });
        const RangoMesesColeccion = mesesObtenidos.results.map(result => ({
            id: result.id,
        }));

        return RangoMesesColeccion
    } catch (error) {
        console.error("Error al obtener el rango de meses esperado:", error.message);
    }
}

function ObtenerPrimerDiaMesSiguiente(fechaString, cantidadMeses) {
    // Convertir la cadena de texto a un objeto Date
    const fecha = new Date(fechaString);

    // Calcular el mes siguiente
    const mesSiguiente = fecha.getMonth() + 1 + cantidadMeses;
    const añoSiguiente = fecha.getFullYear() + Math.floor(mesSiguiente / 12); // Calcular si hay cambio de año
    const mesSiguienteNormalizado = mesSiguiente % 12 || 12; // Normalizar el mes para que esté en el rango [1, 12]
    const primerDiaMesSiguiente = new Date(añoSiguiente, mesSiguienteNormalizado - 1, 1); // Obtener el primer día del mes siguiente

    // Formatear la fecha en el formato YYYY-MM-DD
    const fechaPrimerDiaMesSiguiente = `${primerDiaMesSiguiente.getFullYear()}-${(primerDiaMesSiguiente.getMonth() + 1).toString().padStart(2, '0')}-${primerDiaMesSiguiente.getDate().toString().padStart(2, '0')}`;

    return fechaPrimerDiaMesSiguiente;
}

function reiniciarBot(ctx) {
    // Detener el bot
    bot.stop();

    // Esperar 2 segundos antes de reiniciar
    setTimeout(() => {
        // Volver a iniciar el bot
        bot.launch();

        // Añadir cualquier lógica adicional después de reiniciar
        ctx.reply('Reinicado')
    }, 2000);
}