import crypto from 'crypto';
import mysql, { PoolConnection } from 'mysql';

interface DbConnectionSettings {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  debug: boolean;
}

interface SectionFromDb {
  id: string;
  typeId: number;
  title: string;
  description: string | null;
  settings: string | null;
}

interface Section {
  id: string;
  typeId: number;
  title: string;
  description: string | null;
  settings: object | null;
}

interface SectionType {
  id: number;
  title: string;
}

interface ThingCategory {
  id: number;
  title: string;
}

interface ThingStatus {
  id: number;
  title: string;
}

interface ThingNote {
  id: number;
  text: string;
}

interface ThingFromDb {
  id: number;
  position: number;
  categoryId: number;
  title: string | null;
  startDate: string | null;
  finishDate: string | null;
  body: string;
  meta: string | null;
}

interface Thing {
  id: number;
  position: number;
  categoryId: number;
  title: string | null;
  startDate: string | null;
  finishDate: string | null;
  body: string | null;
  meta: string | null;
}

export default class Model {
  readonly #cache: Map<string, any[]> | null = null;
  readonly #requestTypeToHashMap: Map<string, string> | null = null;
  readonly #dbConnectionPool: mysql.Pool;

  constructor({
    dbConnectionSettings,
    cacheEnabled,
  }: {
    dbConnectionSettings: DbConnectionSettings;
    cacheEnabled: boolean;
  }) {
    this.#dbConnectionPool = mysql.createPool({
      ...dbConnectionSettings,
      waitForConnections: true,
    });

    if (cacheEnabled) {
      this.#cache = new Map<string, any[]>();
      this.#requestTypeToHashMap = new Map<string, string>();
    }
  }

  private query(queryString: string, parameters: any[] = []): Promise<any[]> {
    return (
      new Promise((resolve, reject) => {
        this.#dbConnectionPool.getConnection((error, connection) => {
          if (error) {
            reject(error);
          } else {
            resolve(connection);
          }
        });
      })
        // @ts-ignore
        .then((connection: PoolConnection) => {
          return new Promise((resolve, reject) => {
            connection.query(
              queryString,
              parameters,
              (error, result: any[]) => {
                connection.release();

                if (error) {
                  reject(error);
                } else {
                  resolve(result);
                }
              }
            );
          });
        })
    );
  }

  getHashedResponse(
    hash: string | null
  ): { hash: string; response: any[] } | null {
    if (hash && this.isValidHash(hash)) {
      return {
        response: this.#cache!.get(hash)!,
        hash,
      };
    }

    return null;
  }

  isValidHash(hash: string): boolean {
    return this.#cache?.has(hash) ?? false;
  }

  setHashedResponse(
    requestType: string,
    response: any[]
  ): { hash: string | null; response: any[] } {
    if (this.#cache && this.#requestTypeToHashMap) {
      if (this.#requestTypeToHashMap.has(requestType)) {
        return this.getHashedResponse(
          this.#requestTypeToHashMap.get(requestType)!
        )!;
      }

      const representation = JSON.stringify(response);
      const shaSum = crypto.createHash('sha256');

      shaSum.update(representation);

      // @ts-ignore
      const hash = shaSum.digest('HEX') as string;

      this.#cache.set(hash, response);
      this.#requestTypeToHashMap.set(requestType, hash);

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
    this.#cache?.clear();
    this.#requestTypeToHashMap?.clear();

    return Promise.resolve();
  }

  getSections() {
    const requestType = 'getSections';
    const responseFromCache = this.getHashedResponse(requestType);

    if (responseFromCache) {
      return Promise.resolve(responseFromCache);
    }

    return this.query(
      `
      SELECT
        section_identifier AS id,
        section_type_id AS typeId,
        section_title AS title,
        section_description AS description,
        settings
      FROM v_sections_info;
    `
    )
      .then((sectionsFromDb: SectionFromDb[]) =>
        sectionsFromDb
          .filter((aSectionFromDb) => aSectionFromDb.typeId > 0)
          .map((sectionItem) => {
            const section: Section = {
              ...sectionItem,
              settings: sectionItem.settings
                ? JSON.parse(sectionItem.settings)
                : {},
            };

            return section;
          })
      )
      .then((response) => this.setHashedResponse(requestType, response));
  }

  getSectionThings(sectionIdentifier: string) {
    const requestType = `getSectionThings:${sectionIdentifier}`;
    const responseFromCache = this.getHashedResponse(requestType) as {
      hash: string;
      response: Thing[];
    } | null;

    if (responseFromCache) {
      return Promise.resolve(responseFromCache);
    }

    const restrictedCategories = [4];

    return this.getSections()
      .then(({ response: sections }: { response: { id: string }[] }) => {
        const section = sections.find(
          (aSection) => aSection.id === sectionIdentifier
        );

        if (section) {
          return this.query(
            `
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
        `,
            [sectionIdentifier]
          );
        }

        return Promise.reject(new Error('NOT_FOUND'));
      })
      .then((thingsFromDb: ThingFromDb[]) =>
        thingsFromDb
          .map((aThingFromDb) => {
            const thing: Thing = {
              ...aThingFromDb,
              meta: restrictedCategories.includes(aThingFromDb.categoryId)
                ? null
                : aThingFromDb.meta,
              title: restrictedCategories.includes(aThingFromDb.categoryId)
                ? null
                : aThingFromDb.title,
              startDate: restrictedCategories.includes(aThingFromDb.categoryId)
                ? null
                : aThingFromDb.startDate,
              finishDate: restrictedCategories.includes(aThingFromDb.categoryId)
                ? null
                : aThingFromDb.finishDate,
              body: restrictedCategories.includes(aThingFromDb.categoryId)
                ? null
                : aThingFromDb.body,
            };

            return thing;
          })
          .sort((a, b) => a.position - b.position)
      )
      .then((response) => this.setHashedResponse(requestType, response));
  }

  getSectionTypes() {
    const requestType = 'getSectionTypes';
    const responseFromCache = this.getHashedResponse(requestType);

    if (responseFromCache) {
      return Promise.resolve(responseFromCache);
    }

    return this.query(
      `
      SELECT
        id,
        title
      FROM
        section_type;
    `
    )
      .then((sectionTypes: SectionType[]) =>
        sectionTypes
          .filter((sectionType) => sectionType.id > 0)
          .sort((a, b) => a.id - b.id)
      )
      .then((response) => this.setHashedResponse(requestType, response));
  }

  getThingCategories() {
    const requestType = 'getThingCategories';
    const responseFromCache = this.getHashedResponse(requestType);

    if (responseFromCache) {
      return Promise.resolve(responseFromCache);
    }

    return this.query(
      `
        SELECT
          id,
          title
        FROM
          thing_category;
      `
    )
      .then((thingCategories: ThingCategory[]) =>
        thingCategories.sort((a, b) => a.id - b.id)
      )
      .then((response) => this.setHashedResponse(requestType, response));
  }

  getThingNotes(thingId: number) {
    const requestType = `getThingNotes:${thingId}`;
    const responseFromCache = this.getHashedResponse(requestType) as {
      hash: string;
      response: string[];
    } | null;

    if (responseFromCache) {
      return Promise.resolve(responseFromCache);
    }

    return this.query(
      `
      SELECT
        id,
        text
      FROM
        thing_note
      WHERE
        r_thing_id = ?;
    `,
      [thingId]
    )
      .then((thingNotes: ThingNote[]) =>
        thingNotes
          .sort((a, b) => a.id - b.id)
          .map((thingNote) => thingNote.text)
      )
      .then((response) => this.setHashedResponse(requestType, response));
  }

  getThingStatuses() {
    const requestType = 'getThingStatuses';
    const responseFromCache = this.getHashedResponse(requestType);

    if (responseFromCache) {
      return Promise.resolve(responseFromCache);
    }

    return this.query(
      `
      SELECT id,
        title
      FROM
        thing_status;
    `
    )
      .then((thingStatuses: ThingStatus[]) =>
        thingStatuses.sort((a, b) => a.id - b.id)
      )
      .then((response) => this.setHashedResponse(requestType, response));
  }
}
