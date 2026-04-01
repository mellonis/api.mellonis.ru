import { MySQLPromisePool, MySQLRowDataPacket } from '@fastify/mysql';
import { sectionsQuery, sectionByIdQuery, sectionThingsQuery, thingNotesQuery } from './queries.js';
import type { Section, Thing } from './schemas.js';

type SectionSettings = { show_all?: boolean; things_order?: 1 | -1 };

const withConnection = async <T>(mysql: MySQLPromisePool, fn: (connection: Awaited<ReturnType<MySQLPromisePool['getConnection']>>) => Promise<T>): Promise<T> => {
	const connection = await mysql.getConnection();

	try {
		return await fn(connection);
	} finally {
		connection.release();
	}
};

const parseJSON = (value: string | null): unknown => {
	if (!value) {
		return undefined;
	}

	try {
		return JSON.parse(value);
	} catch {
		return undefined;
	}
};

const parseSettings = (settings: string | null): SectionSettings =>
	(parseJSON(settings) as SectionSettings) ?? {};

export const getSections = async (mysql: MySQLPromisePool): Promise<Section[]> =>
	withConnection(mysql, async (connection) => {
		const [sections] = await connection.query<MySQLRowDataPacket[]>(sectionsQuery);

		return sections.map(({ id, typeId, title, description, settings, thingsCount }) => {
			const { show_all: showAll = false, things_order: thingsOrder = 1 } = parseSettings(settings);

			return {
				id,
				typeId,
				title,
				description: description ?? undefined,
				settings: {
					showAll,
					thingsOrder,
				},
				thingsCount,
			};
		});
	});

export const getSectionById = async (mysql: MySQLPromisePool, id: string): Promise<Section | null> =>
	withConnection(mysql, async (connection) => {
		const [rows] = await connection.query<MySQLRowDataPacket[]>(sectionByIdQuery, [id]);

		if (rows.length === 0) {
			return null;
		}

		const { id: sectionId, typeId, title, description, settings, thingsCount } = rows[0];
		const { show_all: showAll = false, things_order: thingsOrder = 1 } = parseSettings(settings);

		return {
			id: sectionId,
			typeId,
			title: title ?? undefined,
			description: description ?? undefined,
			settings: { showAll, thingsOrder },
			thingsCount,
		};
	});

export const getSectionThings = async (mysql: MySQLPromisePool, id: string): Promise<Thing[]> =>
	withConnection(mysql, async (connection) => {
		const [things] = await connection.query<MySQLRowDataPacket[]>(sectionThingsQuery, [id]);

		return things.map((
			{
				id,
				position,
				categoryId,
				title,
				firstLines,
				startDate,
				finishDate,
				text,
				seoDescription,
				seoKeywords,
				info,
			}) => ({
			id,
			position,
			categoryId,
			title: title ?? undefined,
			firstLines: (firstLines ?? undefined) ? firstLines.replaceAll('\r', '').split('\n') : undefined,
			startDate: startDate ?? undefined,
			finishDate: finishDate ?? undefined,
			text,
			seoDescription: seoDescription ?? undefined,
			seoKeywords: seoKeywords ?? undefined,
			info: parseJSON(info) as Thing['info'],
		}));
	});

export const getThingsNotes = async (mysql: MySQLPromisePool, ids: number[]): Promise<Map<number, string[]>> =>
	withConnection(mysql, async (connection) => {
		const [notes] = await connection.query<MySQLRowDataPacket[]>(thingNotesQuery, [ids]);

		if (notes.length > 0) {
			return notes.reduce((result, { text, thingId }) => {
				if (!result.has(thingId)) {
					result.set(thingId, []);
				}

				result.get(thingId)!.push(text);

				return result;
			}, new Map<number, string[]>());
		}

		return new Map();
	});
