import { MySQLPromisePool, MySQLRowDataPacket } from '@fastify/mysql';
import { sectionsQuery, sectionByIdQuery, sectionThingsQuery, thingNotesQuery } from './queries.js';
import type { Section, Thing } from './schemas.js';

type SectionSettings = { show_all?: boolean; things_order?: 1 | -1 };

const parseSettings = (settings: string | null): SectionSettings => {
	if (!settings) {
		return {};
	}

	try {
		return JSON.parse(settings);
	} catch {
		return {};
	}
};

export const getSections = async (mysql: MySQLPromisePool): Promise<Section[]> => {
	const connection = await mysql.getConnection();

	try {
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
	} finally {
		connection.release();
	}
};

export const getSectionById = async (mysql: MySQLPromisePool, id: string): Promise<Section | null> => {
	const connection = await mysql.getConnection();

	try {
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
	} finally {
		connection.release();
	}
};

export const getSectionThings = async (mysql: MySQLPromisePool, id: string): Promise<Thing[]> => {
	const connection = await mysql.getConnection();

	try {
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
			info: (() => {
				if (!info) {
					return undefined;
				}

				try {
					return JSON.parse(info);
				} catch {
					return undefined;
				}
			})(),
		}));
	} finally {
		connection.release();
	}
};

export const getThingsNotes = async (mysql: MySQLPromisePool, ids: number[]): Promise<Map<number, string[]>> => {
	const connection = await mysql.getConnection();

	try {
		const [notes] = await connection.query<MySQLRowDataPacket[]>(thingNotesQuery, [ids]);

		if (notes.length > 0) {
			return notes.reduce((result, { text, thingId }) => {
				if (!result.has(thingId)) {
					result.set(thingId, []);
				}

				result.get(thingId)!.push(text);

				return result;
			}, new Map() as Awaited<ReturnType<typeof getThingsNotes>>);
		}

		return new Map();
	} finally {
		connection.release();
	}
};
