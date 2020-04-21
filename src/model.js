"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.__esModule = true;
var crypto_1 = require("crypto");
var mysql_1 = require("mysql");
var Model = /** @class */ (function () {
    function Model(_a) {
        var dbConnectionSettings = _a.dbConnectionSettings, cacheEnabled = _a.cacheEnabled;
        _cache.set(this, null);
        _requestTypeToHashMap.set(this, null);
        _dbConnectionPool.set(this, void 0);
        __classPrivateFieldSet(this, _dbConnectionPool, mysql_1["default"].createPool(__assign(__assign({}, dbConnectionSettings), { waitForConnections: true })));
        if (cacheEnabled) {
            __classPrivateFieldSet(this, _cache, new Map());
            __classPrivateFieldSet(this, _requestTypeToHashMap, new Map());
        }
    }
    Model.prototype.query = function (queryString, parameters) {
        var _this = this;
        if (parameters === void 0) { parameters = []; }
        return (new Promise(function (resolve, reject) {
            __classPrivateFieldGet(_this, _dbConnectionPool).getConnection(function (error, connection) {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(connection);
                }
            });
        })
            // @ts-ignore
            .then(function (connection) {
            return new Promise(function (resolve, reject) {
                connection.query(queryString, parameters, function (error, result) {
                    connection.release();
                    if (error) {
                        reject(error);
                    }
                    else {
                        resolve(result);
                    }
                });
            });
        }));
    };
    Model.prototype.getHashedResponse = function (hash) {
        if (hash && this.isValidHash(hash)) {
            return {
                response: __classPrivateFieldGet(this, _cache).get(hash),
                hash: hash
            };
        }
        return null;
    };
    Model.prototype.isValidHash = function (hash) {
        var _a, _b;
        return (_b = (_a = __classPrivateFieldGet(this, _cache)) === null || _a === void 0 ? void 0 : _a.has(hash)) !== null && _b !== void 0 ? _b : false;
    };
    Model.prototype.setHashedResponse = function (requestType, response) {
        if (__classPrivateFieldGet(this, _cache) && __classPrivateFieldGet(this, _requestTypeToHashMap)) {
            if (__classPrivateFieldGet(this, _requestTypeToHashMap).has(requestType)) {
                return this.getHashedResponse(__classPrivateFieldGet(this, _requestTypeToHashMap).get(requestType));
            }
            var representation = JSON.stringify(response);
            var shaSum = crypto_1["default"].createHash('sha256');
            shaSum.update(representation);
            // @ts-ignore
            var hash = shaSum.digest('HEX');
            __classPrivateFieldGet(this, _cache).set(hash, response);
            __classPrivateFieldGet(this, _requestTypeToHashMap).set(requestType, hash);
            return {
                hash: hash,
                response: response
            };
        }
        return {
            hash: null,
            response: response
        };
    };
    Model.prototype.clearCache = function () {
        var _a, _b;
        (_a = __classPrivateFieldGet(this, _cache)) === null || _a === void 0 ? void 0 : _a.clear();
        (_b = __classPrivateFieldGet(this, _requestTypeToHashMap)) === null || _b === void 0 ? void 0 : _b.clear();
        return Promise.resolve();
    };
    Model.prototype.getSections = function () {
        var _this = this;
        var requestType = 'getSections';
        var responseFromCache = this.getHashedResponse(requestType);
        if (responseFromCache) {
            return Promise.resolve(responseFromCache);
        }
        return this.query("\n      SELECT\n        section_identifier AS id,\n        section_type_id AS typeId,\n        section_title AS title,\n        section_description AS description,\n        settings\n      FROM v_sections_info;\n    ")
            .then(function (sectionsFromDb) {
            return sectionsFromDb
                .filter(function (aSectionFromDb) { return aSectionFromDb.typeId > 0; })
                .map(function (sectionItem) {
                var section = __assign(__assign({}, sectionItem), { settings: sectionItem.settings
                        ? JSON.parse(sectionItem.settings)
                        : {} });
                return section;
            });
        })
            .then(function (response) { return _this.setHashedResponse(requestType, response); });
    };
    Model.prototype.getSectionThings = function (sectionIdentifier) {
        var _this = this;
        var requestType = "getSectionThings:" + sectionIdentifier;
        var responseFromCache = this.getHashedResponse(requestType);
        if (responseFromCache) {
            return Promise.resolve(responseFromCache);
        }
        var restrictedCategories = [4];
        return this.getSections()
            .then(function (_a) {
            var sections = _a.response;
            var section = sections.find(function (aSection) { return aSection.id === sectionIdentifier; });
            if (section) {
                return _this.query("\n          SELECT\n            thing_id AS id,\n            thing_position_in_section AS position,\n            thing_category_id AS categoryId,\n            thing_title AS title,\n            thing_start_date AS startDate,\n            thing_finish_date AS finishDate,\n            thing_text AS body,\n            thing_info AS meta\n          FROM\n            v_things_info\n          WHERE\n            section_identifier = ?;\n        ", [sectionIdentifier]);
            }
            return Promise.reject(new Error('NOT_FOUND'));
        })
            .then(function (thingsFromDb) {
            return thingsFromDb
                .map(function (aThingFromDb) {
                var thing = __assign(__assign({}, aThingFromDb), { meta: restrictedCategories.includes(aThingFromDb.categoryId)
                        ? null
                        : aThingFromDb.meta, title: restrictedCategories.includes(aThingFromDb.categoryId)
                        ? null
                        : aThingFromDb.title, startDate: restrictedCategories.includes(aThingFromDb.categoryId)
                        ? null
                        : aThingFromDb.startDate, finishDate: restrictedCategories.includes(aThingFromDb.categoryId)
                        ? null
                        : aThingFromDb.finishDate, body: restrictedCategories.includes(aThingFromDb.categoryId)
                        ? null
                        : aThingFromDb.body });
                return thing;
            })
                .sort(function (a, b) { return a.position - b.position; });
        })
            .then(function (response) { return _this.setHashedResponse(requestType, response); });
    };
    Model.prototype.getSectionTypes = function () {
        var _this = this;
        var requestType = 'getSectionTypes';
        var responseFromCache = this.getHashedResponse(requestType);
        if (responseFromCache) {
            return Promise.resolve(responseFromCache);
        }
        return this.query("\n      SELECT\n        id,\n        title\n      FROM\n        section_type;\n    ")
            .then(function (sectionTypes) {
            return sectionTypes
                .filter(function (sectionType) { return sectionType.id > 0; })
                .sort(function (a, b) { return a.id - b.id; });
        })
            .then(function (response) { return _this.setHashedResponse(requestType, response); });
    };
    Model.prototype.getThingCategories = function () {
        var _this = this;
        var requestType = 'getThingCategories';
        var responseFromCache = this.getHashedResponse(requestType);
        if (responseFromCache) {
            return Promise.resolve(responseFromCache);
        }
        return this.query("\n        SELECT\n          id,\n          title\n        FROM\n          thing_category;\n      ")
            .then(function (thingCategories) {
            return thingCategories.sort(function (a, b) { return a.id - b.id; });
        })
            .then(function (response) { return _this.setHashedResponse(requestType, response); });
    };
    Model.prototype.getThingNotes = function (thingId) {
        var _this = this;
        var requestType = "getThingNotes:" + thingId;
        var responseFromCache = this.getHashedResponse(requestType);
        if (responseFromCache) {
            return Promise.resolve(responseFromCache);
        }
        return this.query("\n      SELECT\n        id,\n        text\n      FROM\n        thing_note\n      WHERE\n        r_thing_id = ?;\n    ", [thingId])
            .then(function (thingNotes) {
            return thingNotes
                .sort(function (a, b) { return a.id - b.id; })
                .map(function (thingNote) { return thingNote.text; });
        })
            .then(function (response) { return _this.setHashedResponse(requestType, response); });
    };
    Model.prototype.getThingStatuses = function () {
        var _this = this;
        var requestType = 'getThingStatuses';
        var responseFromCache = this.getHashedResponse(requestType);
        if (responseFromCache) {
            return Promise.resolve(responseFromCache);
        }
        return this.query("\n      SELECT id,\n        title\n      FROM\n        thing_status;\n    ")
            .then(function (thingStatuses) {
            return thingStatuses.sort(function (a, b) { return a.id - b.id; });
        })
            .then(function (response) { return _this.setHashedResponse(requestType, response); });
    };
    return Model;
}());
exports["default"] = Model;
_cache = new WeakMap(), _requestTypeToHashMap = new WeakMap(), _dbConnectionPool = new WeakMap();
