import dotenv from 'dotenv';
dotenv.config();

// Define required environment variables
const REQUIRED_ENV_VARS = [
    'NOTION_API_KEY',
    'CALENDARIO_DB_ID',
    'MET_PAGO_DB_ID',
    'MESES_DB_ID',
    'FLUJOPLATA_DB_ID',
    'CUOTAS_DB_ID',
    'VIAJES_DB_ID',
    'GASTOS_VIAJES_DB_ID'
];

// Validate that all required environment variables are defined
REQUIRED_ENV_VARS.forEach(envVar => {
    if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
    }
});

// Export database options
const dbOptions = {
    apiKeyNotion: process.env.NOTION_API_KEY,
    dbCalendario: process.env.CALENDARIO_DB_ID,
    dbMetPago: process.env.MET_PAGO_DB_ID,
    dbMeses: process.env.MESES_DB_ID,
    dbFlujoPlata: process.env.FLUJOPLATA_DB_ID,
    dbCuotas: process.env.CUOTAS_DB_ID,
    dbViaje: process.env.VIAJES_DB_ID,
    dbGastosViaje: process.env.GASTOS_VIAJES_DB_ID,
};

export default dbOptions;