import { Client } from '@notionhq/client';
import opcionesDB from '../config/databases.js';
const notion = new Client({ auth: opcionesDB.apiKeyNotion });

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
