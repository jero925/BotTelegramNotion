import dotenv from 'dotenv';
dotenv.config();

const opcionesDB = {
    apiKeyNotion: process.env.NOTION_API_KEY,
    dbCalendario: process.env.CALENDARIO_DB_ID,
    dbMetPago: process.env.MET_PAGO_DB_ID,
    dbMeses: process.env.MESES_DB_ID,
    dbFlujoPlata: process.env.FLUJOPLATA_DB_ID,
    dbCuotas: process.env.CUOTAS_DB_ID,
    dbViaje: process.env.VIAJES_DB_ID,
    dbGastosViaje: process.env.GASTOS_VIAJES_DB_ID,
};

export default opcionesDB;
