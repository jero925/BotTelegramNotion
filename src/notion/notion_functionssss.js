import { Client } from '@notionhq/client';
import opcionesDB from '../config/databases.js';
import { opcionesMovimientoTipoIO } from '../config/movements.js';
import NotionHelper from "notion-helper";
const { createNotion } = NotionHelper;

const notion = new Client({ auth: opcionesDB.apiKeyNotion });

// Obtiene el mes actual desde Notion
export async function ObtenerMesActual() {
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

export async function CrearMovimientoNuevo(properties) {
    try {
        const notionBuilder = createNotion();

        const result = notionBuilder
            .parentDb(opcionesDB.dbFlujoPlata)
            .icon(properties.movimientoImagen)
            .title('Nombre', properties.movimientoNombre)
            .date('Fecha', properties.movimientoFechaActual)
            .relation('Producto en cuotas', properties.movimientoCuotaId)
            .relation('Cuenta', properties.movimientoCuentaId)
            .multiSelect('Tipo', properties.movimientoTipoNombre)
            // .relation('Suscripcion', '')
            .select('I/O', properties.movimientoTipoIO)
            .status('Estado Suscripcion', 'No sub')
            .relation('Ingreso. Mes Año', properties.movimientoTipoIO === opcionesMovimientoTipoIO.Ingreso ? properties.movimientoMesActualId : null)
            .number('Monto', properties.movimientoTipoIO === opcionesMovimientoTipoIO.Gasto ? -properties.movimientoMonto : properties.movimientoMonto)
            .relation('Gasto. Mes Año', properties.movimientoTipoIO === opcionesMovimientoTipoIO.Gasto ? properties.movimientoMesActualId : null)
            .build();
        
        const response = await notion.pages.create(result.content)
    } catch (error) {
        console.error('Error al insertar el registro:', error.message);
    }
}


export async function CreateTravelExpensePage(properties) {
    try {
        const notionBuilder = createNotion();

        const result = notionBuilder
            .parentDb(opcionesDB.dbGastosViaje)
            .title('Nombre', properties.name)
            .multiSelect('Tipo', properties.type)
            .select('Pagador', properties.payer)
            .number('Monto', properties.amount)
            .relation('Viaje', properties.travelId)
            .build();

        const response = await notion.pages.create(result.content)
    } catch (error) {
        console.error('Error al insertar el registro:', error.message);
    }
}

export async function CrearPaginaCuotaNueva(dbid, properties) {
    try {
        const notionBuilder = createNotion();

        const result = notionBuilder
            .parentDb(opcionesDB.dbFlujoPlata)
            .icon(properties.cuotaImagen)
            .title('Nombre', properties.cuotaNombre)
            .number('Monto Total', properties.cuotaMonto)
            .select('Cantidad de cuotas', properties.cuotaCantidadCuotas)
            .date("Primer cuota", properties.cuotaFechaPrimerCuota)
            .date("Fecha de compra", properties.cuotaFechaActual)
            .relation('Meses', properties.cuotaMeses)
            .build();

        const response = await notion.pages.create(result.content)
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