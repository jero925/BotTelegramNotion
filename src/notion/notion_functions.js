import { Client } from '@notionhq/client';
import opcionesDB from '../config/databases.js';
import { opcionesMovimientoTipoIO } from '../config/movements.js';

const notion = new Client({ auth: opcionesDB.apiKeyNotion });

// Obtiene el mes actual desde Notion
export async function ObtenerMesActual() {
    //dbid => dbMeses
    try {
        const mesActual = await notion.databases.query({
            database_id: opcionesDB.dbMeses,
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

export async function ObtenerCuentasPagos() {
    const filters = {
        property: "Tipo",
        select: {
            equals: "Cuenta"
        }
    }
    return getAccounts(filters)
};

export async function getCreditCardList() {
    const filters = {
        and: [
            {
                property: "Tipo",
                select: {
                    equals: "Tarjeta"
                }
            },
            {
                property: "Active",
                checkbox: {
                    "equals": true
                }
            }
        ]
    }


    return getAccounts(filters)
}

export async function getAccounts(filters) {
    try {
        const accounts = await notion.databases.query({
            database_id: opcionesDB.dbMetPago,
            filter: filters
        });
        let contador = 0

        const accountsData = accounts.results.map(result => ({
            cuentaIndice: contador += 1,
            cuentaId: result.id,
            cuentaNombre: result.properties.Name.title[0].text.content
        }));

        const accountsList = accountsData.map((cuenta) => `${cuenta.cuentaIndice}- ${cuenta.cuentaNombre}`).join('\n')
        return { accountsList, accountsData }
    } catch (error) {
        console.error("Error al obtener cuentas de pago Notion:", error.message);
        throw error;
    }
}

export async function getTravelExpenseType() {
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

export async function ObtenerTipoGastoIngreso(dbid) {
    try {
        const respuesta = await notion.databases.retrieve({ database_id: dbid });
        let contador = 0;
        const tiposGastoIngresoColeccion = respuesta.properties.Tipo.multi_select.options.map(result => ({
            tipoGastoIndice: contador += 1,
            tipoGastoId: result.id,
            tipoGastoNombre: result.name
        }));
        const listaGastoTipos = tiposGastoIngresoColeccion.map((tipo) => `${tipo.tipoGastoIndice}- ${tipo.tipoGastoNombre}`).join('\n');
        return { listaGastoTipos, tiposGastoIngresoColeccion };
    } catch (error) {
        console.error("Error al obtener movimiento tipo Notion:", error.message);
        // Retorna valores por defecto para evitar que devuelva undefined.
        return { listaGastoTipos: 'No hay tipos disponibles', tiposGastoIngresoColeccion: [] };
    }
}

export async function getActualTravel() {
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

export async function AddNewTravelExpense(ctx, properties) {
    ctx.reply('Agregando registro nuevo...');
    try {
        await CreateTravelExpensePage(properties);
        ctx.reply('Registro insertado correctamente.');
    } catch (error) {
        console.error('Error al insertar el registro:', error.message);
        ctx.reply('Ocurrió un error al insertar el registro.');
    }
}

export async function CrearMovimientoNuevo(datos) {
    try {

        const movimientoNuevo = await notion.pages.create({
            icon: {
                type: "external",
                external: {
                    url: datos.movimientoImagen//"https:/ / www.notion.so / icons / downward_red.svg" //reemplazado por variable dependiendo gasto o ingreso va a ir un icono u otro
                }
            },
            parent: {
                database_id: opcionesDB.dbFlujoPlata
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


export async function CreateTravelExpensePage(properties) {
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

export async function CrearPaginaCuotaNueva(dbid, datosCuota) {
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

export async function getActivePaymentsByCard(account_id) {
    const filter = {
        property: "Tarjeta",
        relation: {
            contains: account_id
        }
    }

    return await getActivePayments(filter)
}

export async function getActivePayments(filter) {
    const today = new Date().toISOString();

    try {
        const filters = [
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

        if (filter) {
            filters.push(filter)
        }

        const cuotasActivasObtenidas = await notion.databases.query({
            database_id: opcionesDB.dbCuotas,
            filter: {
                "and": filters
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
        const listaCuotasActivas = cuotasActivasColeccion.map((cuota) => `${cuota.cuotaIndice} - ${cuota.cuotaNombre} ${cuota.cuotaMonto !== undefined ? `- $${cuota.cuotaMonto}` : ''} ${cuota.coutasCountCuotasPagadas !== undefined ? `- ${cuota.coutasCountCuotasPagadas}` : ''}`).join('\n');


        return { listaCuotasActivas, cuotasActivasColeccion };
    } catch (error) {
        console.error("Error al obtener Cuotas Activas:", error.message);
    }
}

export async function ObtenerMesesEnRangoFecha(dbid, fechaInicio, fechaFin) {
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

//Crea 
export async function AgregarRegistroNuevo(ctx, paymentData) {
    ctx.reply('Agregando registro nuevo...');
    try {
        await CrearMovimientoNuevo(paymentData);
        ctx.reply('Registro insertado correctamente.');
    } catch (error) {
        console.error('Error al insertar el registro:', error.message);
        ctx.reply('Ocurrió un error al insertar el registro.');
    }
}

export async function CreatePayment(ctx, paymentData) {
    try {
        await CrearMovimientoNuevo(paymentData);
    } catch (error) {
        console.error('Error al insertar el registro:', error.message);
        ctx.reply('Ocurrió un error al insertar el registro.');
    }
}