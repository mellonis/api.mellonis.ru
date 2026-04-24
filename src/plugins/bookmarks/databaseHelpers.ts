import type { MySQLPromisePool, MySQLRowDataPacket } from '@fastify/mysql';
import { withConnection } from '../../lib/databaseHelpers.js';
import { splitLines } from '../../lib/mappers.js';
import {
	getBookmarksQuery,
	resolveThingIdQuery,
	addBookmarkQuery,
	deleteBookmarkQuery,
	deleteAllBookmarksQuery,
	insertBookmarkWithOrderQuery,
} from './queries.js';

export interface BookmarkRow {
	sectionId: string;
	positionInSection: number;
	title: string | null;
	firstLines: string[] | null;
}

export interface ResolvedThing {
	thingId: number;
	sectionId: number;
}

const mapBookmarkRow = (row: MySQLRowDataPacket): BookmarkRow => ({
	sectionId: row.sectionId as string,
	positionInSection: row.positionInSection as number,
	title: (row.title as string) ?? null,
	firstLines: row.firstLines
		? splitLines(row.firstLines as string)
		: null,
});

export const getBookmarks = async (mysql: MySQLPromisePool, userId: number): Promise<BookmarkRow[]> =>
	withConnection(mysql, async (connection) => {
		const [rows] = await connection.query<MySQLRowDataPacket[]>(getBookmarksQuery, [userId]);
		return rows.map(mapBookmarkRow);
	});

export const resolveThingId = async (
	mysql: MySQLPromisePool,
	sectionIdentifier: string,
	positionInSection: number,
): Promise<ResolvedThing | null> =>
	withConnection(mysql, async (connection) => {
		const [rows] = await connection.query<MySQLRowDataPacket[]>(resolveThingIdQuery, [sectionIdentifier, positionInSection]);
		return rows.length > 0
			? { thingId: rows[0].thingId as number, sectionId: rows[0].sectionId as number }
			: null;
	});

export const addBookmark = async (mysql: MySQLPromisePool, userId: number, thingId: number, sectionId: number): Promise<void> => {
	await withConnection(mysql, async (connection) => {
		await connection.query(addBookmarkQuery, [userId, thingId, sectionId, userId]);
	});
};

export const removeBookmark = async (mysql: MySQLPromisePool, userId: number, thingId: number, sectionId: number): Promise<void> => {
	await withConnection(mysql, async (connection) => {
		await connection.query(deleteBookmarkQuery, [userId, thingId, sectionId]);
	});
};

export const reorderBookmarks = async (mysql: MySQLPromisePool, userId: number, items: ResolvedThing[]): Promise<void> => {
	await withConnection(mysql, async (connection) => {
		await connection.beginTransaction();

		try {
			await connection.query(deleteAllBookmarksQuery, [userId]);

			for (let i = 0; i < items.length; i++) {
				await connection.query(insertBookmarkWithOrderQuery, [userId, items[i].thingId, items[i].sectionId, i]);
			}

			await connection.commit();
		} catch (error) {
			await connection.rollback();
			throw error;
		}
	});
};

export const bulkAddBookmarks = async (mysql: MySQLPromisePool, userId: number, items: ResolvedThing[]): Promise<void> => {
	await withConnection(mysql, async (connection) => {
		const [rows] = await connection.query<MySQLRowDataPacket[]>(
			'SELECT COALESCE(MAX(order_index), -1) AS maxOrder FROM bookmark WHERE r_user_id = ?',
			[userId],
		);
		let nextOrder = (rows[0].maxOrder as number) + 1;

		for (const item of items) {
			await connection.query(insertBookmarkWithOrderQuery, [userId, item.thingId, item.sectionId, nextOrder]);
			nextOrder++;
		}
	});
};
