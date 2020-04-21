"use strict";
exports.__esModule = true;
var express_1 = require("express");
var model_js_1 = require("./model.js");
var dbConnectionSettings = {
    host: String(process.env.MYSQL_HOST),
    port: Number(process.env.MYSQL_PORT),
    database: String(process.env.MYSQL_DATABASE),
    user: String(process.env.MYSQL_USER),
    password: String(process.env.MYSQL_PASSWORD),
    debug: process.env.MYSQL_LOG_CONNECTION === 'true'
};
var cacheEnabled = process.env.CACHE_ENABLED !== 'false';
var accessControlAllowOrigin = (process.env.ACCESS_CONTROL_ALLOW_ORIGIN || '').trim();
var model = new model_js_1["default"]({
    dbConnectionSettings: dbConnectionSettings,
    cacheEnabled: cacheEnabled
});
var app = express_1["default"]();
app.use(function (request, response, next) {
    var etag = request.get('If-None-Match');
    if (etag && model.isValidHash(etag)) {
        response.sendStatus(304);
    }
    else {
        next();
    }
});
function errorHandler(request, response, error) {
    // tslint:disable-next-line:no-console
    console.error(new Date() + " [ERROR] " + error.message);
    response.sendStatus(500);
}
function resultHandler(request, response, _a) {
    var modelResponse = _a.response, hash = _a.hash;
    if (cacheEnabled && hash) {
        response.set({
            ETag: hash
        });
    }
    if (accessControlAllowOrigin) {
        response.set({
            'Access-Control-Allow-Origin': '*'
        });
    }
    response.contentType('application/json').send(modelResponse);
}
app.post('/clearCache', function (request, response) {
    model
        .clearCache()
        .then(function () { return response.sendStatus(200); })["catch"](function (error) { return errorHandler(request, response, error); });
});
app.get('/sectionTypes', function (request, response) {
    model
        .getSectionTypes()
        .then(function (result) { return resultHandler(request, response, result); })["catch"](function (error) { return errorHandler(request, response, error); });
});
app.get('/thingStatuses', function (request, response) {
    model
        .getThingStatuses()
        .then(function (result) { return resultHandler(request, response, result); })["catch"](function (error) { return errorHandler(request, response, error); });
});
app.get('/thingCategories', function (request, response) {
    model
        .getThingCategories()
        .then(function (result) { return resultHandler(request, response, result); })["catch"](function (error) { return errorHandler(request, response, error); });
});
app.get('/sections', function (request, response) {
    model
        .getSections()
        .then(function (result) { return resultHandler(request, response, result); })["catch"](function (error) { return errorHandler(request, response, error); });
});
app.get('/sections/:sectionIdentifier', function (request, response) {
    model
        .getSectionThings(request.params.sectionIdentifier)
        .then(function (result) { return resultHandler(request, response, result); })["catch"](function (error) {
        if (error.message === 'NOT_FOUND') {
            response.sendStatus(404);
        }
        else {
            throw error;
        }
    })["catch"](function (error) { return errorHandler(request, response, error); });
});
app.get('/thingNotes/:thingId', function (request, response) {
    model
        .getThingNotes(Number(request.params.thingId))
        .then(function (result) { return resultHandler(request, response, result); })["catch"](function (error) { return errorHandler(request, response, error); });
});
app.listen(3000);
