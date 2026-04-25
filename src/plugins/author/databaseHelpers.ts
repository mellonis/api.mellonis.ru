import type { MySQLPromisePool, MySQLRowDataPacket } from '@fastify/mysql';
import { authorQuery } from './queries.js';
import type { Author } from './schemas.js';
import { withConnection } from '../../lib/databaseHelpers.js';

export const getAuthor = async (mysql: MySQLPromisePool): Promise<Author | null> =>
	withConnection(mysql, async (connection) => {
		const [rows] = await connection.query<MySQLRowDataPacket[]>(authorQuery);

		if (rows.length === 0) {
			return null;
		}

		return {
			text: rows[0].text,
			date: rows[0].date as string,
			seoDescription: rows[0].seoDescription ?? undefined,
			seoKeywords: rows[0].seoKeywords ?? undefined,
		};
	});
