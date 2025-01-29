import { Client } from '@notionhq/client';
import dbOptions from '../config/databases.js';

const notion = new Client({ auth: dbOptions.apiKeyNotion });

export async function queryDatabase(databaseId, filter) {
    try {
        return await notion.databases.query({ database_id: databaseId, filter });
    } catch (error) {
        console.error(`Error al consultar la base de datos ${databaseId}:`, error.message);
        throw error;
    }
}

export async function retrieveDatabase(databaseId) {
    try {
        return await notion.databases.retrieve({ database_id: databaseId });
    } catch (error) {
        console.error(`Error al recuperar la base de datos ${databaseId}:`, error.message);
        throw error;
    }
}

export async function createPage(pageProperties) {
    try {
        return await notion.pages.create(pageProperties);
    } catch (error) {
        console.error('Error al crear la página en Notion:', error.message);
        throw error;
    }
}

export async function updatePage(pageId, properties) {
    try {
        return await notion.pages.update({ page_id: pageId, properties });
    } catch (error) {
        console.error('Error al actualizar la página en Notion:', error.message);
        throw error;
    }
}