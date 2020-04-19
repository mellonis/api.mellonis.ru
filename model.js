import crypto from 'crypto';

export default class Model {
  #db;
  #cache = new Map();

  constructor(db) {
    this.#db = db;
  }

  #getHashedResponse = function (hash) {
    if (this.isValidHash()) {
      return {
        response: this.#cache.get(hash),
        hash,
      };
    }

    return null;
  }

  isValidHash(hash) {
    return this.#cache.has(hash);
  }

  #setHashedResponse = function (requestType, response) {
    const representation = JSON.stringify(response);
    const shaSum = crypto.createHash('sha256');

    shaSum.update(representation)

    const hash = shaSum.digest('HEX');

    this.#cache.set(requestType, response);
    this.#cache.set(hash, response);

    return {
      response,
      hash,
    };
  }

  clearCache() {
    this.#cache.clear();

    return Promise.resolve();
  }

  getSections(sectionIdentifier = null, hash = null) {
    const restrictedCategoryList = [4];

    const responseFromCache = this.#getHashedResponse(hash);

    if (responseFromCache) {
      return Promise.resolve(responseFromCache);
    }

    if (sectionIdentifier) {
      return this.getSections(null, 'getSections')
        .then(({response: sectionList}) => {
          const section = sectionList.find((section) => section.id === sectionIdentifier);

          if (section) {
            return new Promise((resolve, reject) => {
              this.#db.query(`
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
        `, [sectionIdentifier], (error, result) => {
                if (error) {
                  reject(500);
                } else {
                  resolve(result);
                }
              });
            });
          }

          return Promise.reject(404);
        })
        .then((thingList) => {
          thingList = thingList
            .map((thing) => ({
              ...thing,
              meta: restrictedCategoryList.includes(thing.categoryId) ? null : thing.meta || {},
              title: restrictedCategoryList.includes(thing.categoryId) ? null : thing.title,
              startDate: restrictedCategoryList.includes(thing.categoryId) ? null : thing.startDate,
              finishDate: restrictedCategoryList.includes(thing.categoryId) ? null : thing.finishDate,
              body: restrictedCategoryList.includes(thing.categoryId) ? null : thing.body,
            }))
            .sort((a, b) => a.position - b.position);

          return thingList;
        })
        .then(this.#setHashedResponse.bind(this, `getSections_${sectionIdentifier}`));
    } else {
      return new Promise((resolve, reject) => {
        this.#db.query(`
          SELECT
            section_identifier AS id,
            section_type_id AS typeId, 
            section_title AS title, 
            section_description AS description, 
            settings 
          FROM v_sections_info;
        `, (error, sectionList) => {
          if (error) {
            reject(500);
          } else {
            sectionList = sectionList
              .filter((section) => section.typeId > 0)
              .map((section) => ({
                ...section,
                settings: section.settings ? JSON.parse(section.settings) : {},
              }));

            resolve(sectionList);
          }
        });
      })
        .then(this.#setHashedResponse.bind(this, 'getSections'));
    }
  }

  getSectionTypes(hash = null) {
    const responseFromCache = this.#getHashedResponse(hash);

    if (responseFromCache) {
      return Promise.resolve(responseFromCache);
    }

    return new Promise((resolve, reject) => {
      this.#db.query(`
        SELECT
          id,
          title 
        FROM
          section_type;
      `, (error, sectionTypeList) => {
        if (error) {
          reject(500);
        } else {
          sectionTypeList = sectionTypeList
            .filter((sectionType) => sectionType.id > 0)
            .sort((a, b) => a.id - b.id);

          resolve(sectionTypeList);
        }
      });
    })
      .then(this.#setHashedResponse.bind(this, 'getSectionTypes'));
  }

  getThingCategories(hash = null) {
    const responseFromCache = this.#getHashedResponse(hash);

    if (responseFromCache) {
      return Promise.resolve(responseFromCache);
    }

    return new Promise((resolve, reject) => {
      this.#db.query(`
        SELECT
          id,
          title 
        FROM
          thing_category;
      `, (error, thingCategoryList) => {
        if (error) {
          reject(500);
        } else {
          thingCategoryList = thingCategoryList
            .sort((a, b) => a.id - b.id);

          resolve(thingCategoryList);
        }
      })
    })
      .then(this.#setHashedResponse.bind(this, 'getThingCategories'));
  }

  getThingNotes(thingId, hash = null) {
    const responseFromCache = this.#getHashedResponse(hash);

    if (responseFromCache) {
      return Promise.resolve(responseFromCache);
    }

    return new Promise((resolve, reject) => {
      this.#db.query(`
        SELECT
          id,
          text 
        FROM
          thing_note
        WHERE 
          r_thing_id = ?;
      `, [thingId], (error, thingNoteList) => {
        if (error) {
          reject(500);
        } else {
          thingNoteList = thingNoteList
            .sort((a, b) => a.id - b.id)
            .map((thingNote) => thingNote.text);

          resolve(thingNoteList);
        }
      });
    })
      .then(this.#setHashedResponse.bind(this, 'getThingNotes'));
  }

  getThingStatuses(hash = null) {
    const responseFromCache = this.#getHashedResponse(hash);

    if (responseFromCache) {
      return Promise.resolve(responseFromCache);
    }

    return new Promise((resolve, reject) => {
      this.#db.query('SELECT id, title FROM thing_status;', (error, thingStatusList) => {
        if (error) {
          reject(500);
        } else {
          thingStatusList = thingStatusList
            .sort((a, b) => a.id - b.id);

          resolve(thingStatusList);
        }
      });
    })
      .then(this.#setHashedResponse.bind(this, 'getThingStatuses'));
  }
}