import { createPage } from '../services/notion-service.js';
import NotionHelper from "notion-helper";
const { createNotion } = NotionHelper;

export class NotionPageFactory {
    constructor(databaseId) {
        this.databaseId = databaseId;
        this.notionBuilder = createNotion().parentDb(databaseId);
    }

    setIcon(icon) {
        this.notionBuilder.icon(icon);
        return this;
    }

    setTitle(title, content) {
        this.notionBuilder.title(title, content);
        return this;
    }

    setDate(property, date) {
        this.notionBuilder.date(property, date);
        return this;
    }

    setRelation(property, relationId) {
        if (relationId) {
            this.notionBuilder.relation(property, relationId);
        }
        return this;
    }

    setMultiSelect(property, options) {
        this.notionBuilder.multiSelect(property, options);
        return this;
    }

    setSelect(property, option) {
        this.notionBuilder.select(property, option);
        return this;
    }

    setStatus(property, status) {
        this.notionBuilder.status(property, status);
        return this;
    }

    setNumber(property, value) {
        if (typeof value !== 'number') {
            throw new Error(`El valor para la propiedad ${property} debe ser un número.`);
        }
        this.notionBuilder.number(property, value);
        return this;
    }

    build() {
        return this.notionBuilder.build();
    }

    create(properties) {
        return createPage(properties);
    }
}