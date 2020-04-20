var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var _cache, _requestTypeToHashMap, _dbConnectionPool;
import crypto from 'crypto';
import mysql from 'mysql';
export default class Model {
    constructor({ dbConnectionSettings, cacheEnabled }) {
        _cache.set(this, null);
        _requestTypeToHashMap.set(this, null);
        _dbConnectionPool.set(this, void 0);
        __classPrivateFieldSet(this, _dbConnectionPool, mysql.createPool({
            ...dbConnectionSettings,
            waitForConnections: true,
        }));
        if (cacheEnabled) {
            __classPrivateFieldSet(this, _cache, new Map());
            __classPrivateFieldSet(this, _requestTypeToHashMap, new Map());
        }
    }
    query(queryString, parameters = []) {
        return new Promise((resolve, reject) => {
            __classPrivateFieldGet(this, _dbConnectionPool).getConnection((error, connection) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(connection);
                }
            });
        })
            // @ts-ignore
            .then((connection) => {
            return new Promise((resolve, reject) => {
                connection.query(queryString, parameters, (error, result) => {
                    connection.release();
                    if (error) {
                        reject(error);
                    }
                    else {
                        resolve(result);
                    }
                });
            });
        });
    }
    getHashedResponse(hash) {
        if (hash && this.isValidHash(hash)) {
            return {
                response: __classPrivateFieldGet(this, _cache).get(hash),
                hash,
            };
        }
        return null;
    }
    isValidHash(hash) {
        var _a, _b;
        return (_b = (_a = __classPrivateFieldGet(this, _cache)) === null || _a === void 0 ? void 0 : _a.has(hash)) !== null && _b !== void 0 ? _b : false;
    }
    setHashedResponse(requestType, response) {
        if (__classPrivateFieldGet(this, _cache) && __classPrivateFieldGet(this, _requestTypeToHashMap)) {
            if (__classPrivateFieldGet(this, _requestTypeToHashMap).has(requestType)) {
                return this.getHashedResponse(__classPrivateFieldGet(this, _requestTypeToHashMap).get(requestType));
            }
            const representation = JSON.stringify(response);
            const shaSum = crypto.createHash('sha256');
            shaSum.update(representation);
            // @ts-ignore
            const hash = shaSum.digest('HEX');
            __classPrivateFieldGet(this, _cache).set(hash, response);
            __classPrivateFieldGet(this, _requestTypeToHashMap).set(requestType, hash);
            return {
                hash,
                response,
            };
        }
        return {
            hash: null,
            response,
        };
    }
    clearCache() {
        var _a, _b;
        (_a = __classPrivateFieldGet(this, _cache)) === null || _a === void 0 ? void 0 : _a.clear();
        (_b = __classPrivateFieldGet(this, _requestTypeToHashMap)) === null || _b === void 0 ? void 0 : _b.clear();
        return Promise.resolve();
    }
    getSections() {
        const requestType = 'getSections';
        const responseFromCache = this.getHashedResponse(requestType);
        if (responseFromCache) {
            return Promise.resolve(responseFromCache);
        }
        return this.query(`
      SELECT
        section_identifier AS id,
        section_type_id AS typeId,
        section_title AS title,
        section_description AS description,
        settings
      FROM v_sections_info;
    `)
            .then((sectionsFromDb) => sectionsFromDb
            .filter((aSectionFromDb) => aSectionFromDb.typeId > 0)
            .map((sectionItem) => {
            const section = {
                ...sectionItem,
                settings: sectionItem.settings ? JSON.parse(sectionItem.settings) : {},
            };
            return section;
        }))
            .then((response) => this.setHashedResponse(requestType, response));
    }
    getSectionThings(sectionIdentifier) {
        const requestType = `getSectionThings:${sectionIdentifier}`;
        const responseFromCache = this.getHashedResponse(requestType);
        if (responseFromCache) {
            return Promise.resolve(responseFromCache);
        }
        const restrictedCategories = [4];
        return this.getSections()
            .then(({ response: sections }) => {
            const section = sections.find((aSection) => aSection.id === sectionIdentifier);
            if (section) {
                return this.query(`
          SELECT
            thing_id AS id,
            thing_position_in_section AS position,
            thing_category_id AS categoryId,
            thing_title AS title,
            thing_start_date AS startDate,
            thing_finish_date AS finishDate,
            thing_text AS body,
            thing_info AS meta
          FROM
            v_things_info
          WHERE
            section_identifier = ?;
        `, [sectionIdentifier]);
            }
            return Promise.reject(new Error('NOT_FOUND'));
        })
            .then((thingsFromDb) => thingsFromDb
            .map((aThingFromDb) => {
            const thing = {
                ...aThingFromDb,
                meta: restrictedCategories.includes(aThingFromDb.categoryId) ? null : aThingFromDb.meta,
                title: restrictedCategories.includes(aThingFromDb.categoryId) ? null : aThingFromDb.title,
                startDate: restrictedCategories.includes(aThingFromDb.categoryId) ? null : aThingFromDb.startDate,
                finishDate: restrictedCategories.includes(aThingFromDb.categoryId) ? null : aThingFromDb.finishDate,
                body: restrictedCategories.includes(aThingFromDb.categoryId) ? null : aThingFromDb.body,
            };
            return thing;
        })
            .sort((a, b) => a.position - b.position))
            .then((response) => this.setHashedResponse(requestType, response));
    }
    getSectionTypes() {
        const requestType = 'getSectionTypes';
        const responseFromCache = this.getHashedResponse(requestType);
        if (responseFromCache) {
            return Promise.resolve(responseFromCache);
        }
        return this.query(`
      SELECT
        id,
        title
      FROM
        section_type;
    `)
            .then((sectionTypes) => sectionTypes
            .filter((sectionType) => sectionType.id > 0)
            .sort((a, b) => a.id - b.id))
            .then((response) => this.setHashedResponse(requestType, response));
    }
    getThingCategories() {
        const requestType = 'getThingCategories';
        const responseFromCache = this.getHashedResponse(requestType);
        if (responseFromCache) {
            return Promise.resolve(responseFromCache);
        }
        return this.query(`
        SELECT
          id,
          title
        FROM
          thing_category;
      `)
            .then((thingCategories) => thingCategories
            .sort((a, b) => a.id - b.id))
            .then((response) => this.setHashedResponse(requestType, response));
    }
    getThingNotes(thingId) {
        const requestType = `getThingNotes:${thingId}`;
        const responseFromCache = this.getHashedResponse(requestType);
        if (responseFromCache) {
            return Promise.resolve(responseFromCache);
        }
        return this.query(`
      SELECT
        id,
        text
      FROM
        thing_note
      WHERE
        r_thing_id = ?;
    `, [thingId])
            .then((thingNotes) => thingNotes
            .sort((a, b) => a.id - b.id)
            .map((thingNote) => thingNote.text))
            .then((response) => this.setHashedResponse(requestType, response));
    }
    getThingStatuses() {
        const requestType = 'getThingStatuses';
        const responseFromCache = this.getHashedResponse(requestType);
        if (responseFromCache) {
            return Promise.resolve(responseFromCache);
        }
        return this.query(`
      SELECT id,
        title
      FROM
        thing_status;
    `)
            .then((thingStatuses) => thingStatuses
            .sort((a, b) => a.id - b.id))
            .then((response) => this.setHashedResponse(requestType, response));
    }
}
_cache = new WeakMap(), _requestTypeToHashMap = new WeakMap(), _dbConnectionPool = new WeakMap();
