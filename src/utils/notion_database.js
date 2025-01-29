import { Client } from '@notionhq/client';
import opcionesDB from '../config/databases.js';
const notion = new Client({ auth: opcionesDB.apiKeyNotion });

export async function queryDatabase(databaseId, filter) {
    try {
        return await notion.databases.query({ database_id: databaseId, filter });
    } catch (error) {
        console.error(`Error al consultar la base de datos ${databaseId}:`, error.message);
        throw error;
    }
};

export async function retrieveDatabase(databaseId) {
    try {
        return await notion.databases.retrieve({ database_id: databaseId });
    } catch (error) {
        console.error(`Error al recuperar la base de datos ${databaseId}:`, error.message);
        throw error;
    }
};