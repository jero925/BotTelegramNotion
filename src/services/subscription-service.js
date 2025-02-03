import { queryDatabase } from './notion-service.js';
import dbOptions from '../config/databases.js';

export async function getAllSubscriptions(filter) {
    const filters = [
        { property: "Active", checkbox: { equals: true } }
    ];

    if (filter) filters.push(filter);
    
    const subscriptions = await queryDatabase(dbOptions.subscriptions, { and: filters });
    const subscriptionsData = subscriptions.results.map((result, index) => ({
        index: index + 1,
        id: result.id,
        name: result.properties.Name.title[0].text.content
    }));
    const subscriptionList = subscriptionsData.map((s) => `${s.index}- ${s.name}`).join('\n');
    return { subscriptionList, subscriptionsData };
}

export async function getUnpayedSubscriptions() {
    const filter = { property: "Payed", checkbox: { equals: false } }

    return await getAllSubscriptions(filter)
}