import express from 'express';
import Model from './model.js';
const dbConnectionSettings = {
    host: String(process.env.MYSQL_HOST),
    port: Number(process.env.MYSQL_PORT),
    database: String(process.env.MYSQL_DATABASE),
    user: String(process.env.MYSQL_USER),
    password: String(process.env.MYSQL_PASSWORD),
    debug: process.env.MYSQL_LOG_CONNECTION === 'true',
};
const cacheEnabled = process.env.CACHE_ENABLED !== 'false';
const accessControlAllowOrigin = (process.env.ACCESS_CONTROL_ALLOW_ORIGIN || '').trim();
const model = new Model({
    dbConnectionSettings,
    cacheEnabled,
});
const app = express();
app.use((request, response, next) => {
    const etag = request.get('If-None-Match');
    if (etag && model.isValidHash(etag)) {
        response.sendStatus(304);
    }
    else {
        next();
    }
});
function errorHandler(request, response, error) {
    // tslint:disable-next-line:no-console
    console.error(`${new Date()} [ERROR] ${error.message}`);
    response.sendStatus(500);
}
function resultHandler(request, response, { response: modelResponse, hash }) {
    if (cacheEnabled && hash) {
        response.set({
            ETag: hash,
        });
    }
    if (accessControlAllowOrigin) {
        response.set({
            'Access-Control-Allow-Origin': '*',
        });
    }
    response.contentType('application/json').send(modelResponse);
}
app.post('/clearCache', (request, response) => {
    model
        .clearCache()
        .then(() => response.sendStatus(200))
        .catch((error) => errorHandler(request, response, error));
});
app.get('/sectionTypes', (request, response) => {
    model
        .getSectionTypes()
        .then((result) => resultHandler(request, response, result))
        .catch((error) => errorHandler(request, response, error));
});
app.get('/thingStatuses', (request, response) => {
    model
        .getThingStatuses()
        .then((result) => resultHandler(request, response, result))
        .catch((error) => errorHandler(request, response, error));
});
app.get('/thingCategories', (request, response) => {
    model
        .getThingCategories()
        .then((result) => resultHandler(request, response, result))
        .catch((error) => errorHandler(request, response, error));
});
app.get('/sections', (request, response) => {
    model
        .getSections()
        .then((result) => resultHandler(request, response, result))
        .catch((error) => errorHandler(request, response, error));
});
app.get('/sections/:sectionIdentifier', (request, response) => {
    model
        .getSectionThings(request.params.sectionIdentifier)
        .then((result) => resultHandler(request, response, result))
        .catch((error) => {
        if (error.message === 'NOT_FOUND') {
            response.sendStatus(404);
        }
        else {
            throw error;
        }
    })
        .catch((error) => errorHandler(request, response, error));
});
app.get('/thingNotes/:thingId', (request, response) => {
    model
        .getThingNotes(Number(request.params.thingId))
        .then((result) => resultHandler(request, response, result))
        .catch((error1) => errorHandler(request, response, error1));
});
app.listen(3000);
