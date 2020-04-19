import dotenv from 'dotenv';
import express from 'express';
import getDb from './db.js';
import Model from './model.js';

dotenv.config();

getDb(process.env)
  .then((db) => {
    return new Model(db);
  })
  .then((model) => {
    const app = express();

    app.use(qq90);

    app.post('/clearCache', (request, response) => {
      model
        .clearCache()
        .then(() => response.sendStatus(200))
        .catch((error) => response.status(500).send(error));
    });

    app.get('/sectionTypes', (request, response) => {
      model.getSectionTypes()
        .then(({response: modelResponse, hash}) => response
          .contentType('application/json')
          .set({
            ETag: hash,
          })
          .send(modelResponse)
        )
        .catch((error) => response.status(500).send(error));
    });

    app.get('/thingStatuses', (request, response) => {
      model.getThingStatuses()
        .then(({response: modelResponse, hash}) => response
          .contentType('application/json')
          .set({
            ETag: hash,
          })
          .send(modelResponse)
        )
        .catch((error) => response.status(500).send(error));
    });

    app.get('/thingCategories', (request, response) => {
      model.getThingCategories()
        .then(({response: modelResponse, hash}) => response
          .contentType('application/json')
          .set({
            ETag: hash,
          })
          .send(modelResponse)
        )
        .catch((error) => response.status(500).send(error));
    });

    app.get('/sections', (request, response) => {
      model.getSections()
        .then(({response: modelResponse, hash}) => response
          .contentType('application/json')
          .set({
            ETag: hash,
          })
          .send(modelResponse)
        )
        .catch((error) => {
          response.send(error);
        });
    });

    app.get('/sections/:sectionIdentifier', (request, response) => {
      model.getSections(request.params.sectionIdentifier)
        .then(({response: modelResponse, hash}) => response
          .contentType('application/json')
          .set({
            ETag: hash,
          })
          .send(modelResponse)
        )
        .catch((error) => response.status(500).send(error));
    });

    app.get('/thingNotes/:thingId', (request, response) => {
      model.getThingNotes(request.params.thingId)
        .then(({response: modelResponse, hash}) => response
          .contentType('application/json')
          .set({
            ETag: hash,
          })
          .send(modelResponse)
        )
        .catch((error) => response.status(500).send(error));
    });

    app.listen(3000);

    function qq90(request, response, next) {
      const etag = request.get('If-None-Match');

      if (model.isValidHash(etag)) {
        response.sendStatus(304);
      } else {
        next();
      }
    }
  })
  .catch(console.error);



