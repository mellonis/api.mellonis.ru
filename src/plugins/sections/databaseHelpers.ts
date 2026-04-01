import { MySQLPromisePool, MySQLRowDataPacket } from '@fastify/mysql';
import { sectionsQuery, sectionByIdQuery, sectionThingsQuery, thingNotesQuery } from './queries.js';

type SectionSettings = { show_all?: boolean; things_order?: 1 | -1 };

export const getSections = async (mysql: MySQLPromisePool): Promise<{
	id: string,
	typeId: number,
	title?: string,
	description?: string,
	settings: {
		showAll: boolean,
		thingsOrder: 1 | -1
	},
	thingsCount: number
}[]> => {
	const connection = await mysql.getConnection();

	try {
		const [sections] = await connection.query<MySQLRowDataPacket[]>(sectionsQuery);

		return sections.map(({ id, typeId, title, description, settings, thingsCount }) => {
			let parsedSettings: SectionSettings = {};

			try {
				parsedSettings = settings ? JSON.parse(settings) : {};
			} catch {
				// ignore malformed settings
			}

			const { show_all: showAll = false, things_order: thingsOrder = 1 } = parsedSettings;

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

export const getSectionById = async (mysql: MySQLPromisePool, id: string): Promise<{
	id: string,
	typeId: number,
	title?: string,
	description?: string,
	settings: {
		showAll: boolean,
		thingsOrder: 1 | -1
	},
	thingsCount: number
} | null> => {
	const connection = await mysql.getConnection();

	try {
		const [rows] = await connection.query<MySQLRowDataPacket[]>(sectionByIdQuery, [id]);

		if (rows.length === 0) {
			return null;
		}

		const { id: sectionId, typeId, title, description, settings, thingsCount } = rows[0];

		let parsedSettings: SectionSettings = {};

		try {
			parsedSettings = settings ? JSON.parse(settings) : {};
		} catch {
			// ignore malformed settings
		}

		const { show_all: showAll = false, things_order: thingsOrder = 1 } = parsedSettings;

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

export const getSectionThings = async (mysql: MySQLPromisePool, id: string): Promise<{
	id: number,
	position: number,
	categoryId: number,
	title?: string,
	firstLines?: string,
	startDate?: string,
	finishDate?: string,
	text: string,
	seoDescription?: string,
	seoKeywords?: string,
}[]> => {
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
