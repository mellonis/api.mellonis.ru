import { MySQLPromisePool, MySQLRowDataPacket } from '@fastify/mysql';
import { sectionsQuery, sectionThingsQuery, thinNotesQuery } from './queries.js';

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
			const { show_all: showAll = false, things_order: thingsOrder = 1 } = settings ? JSON.parse(settings) : {};

			return {
				id,
				typeId,
				title: title,
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

export const getSectionThings = async (mysql: MySQLPromisePool, id: string): Promise<{
	id: number,
	position: number,
	categoryId: number,
	title?: string,
	firstLines?: string,
	startDate?: string,
	finishDate?: string,
	text: string,
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
			}) => ({
			id,
			position,
			categoryId,
			title: title ?? undefined,
			firstLines: (firstLines ?? undefined) ? firstLines.split('\n') : undefined,
			startDate: startDate ?? undefined,
			finishDate: finishDate ?? undefined,
			text,
		}));
	} finally {
		connection.release();
	}
};

export const getThingsNotes = async (mysql: MySQLPromisePool, ids: number[]): Promise<Map<number, string[]>> => {
	const connection = await mysql.getConnection();

	try {
		const [notes] = await connection.query<MySQLRowDataPacket[]>(thinNotesQuery, [ids]);

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
