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

		const date: Date = rows[0].date;

		return { text: rows[0].text, date: date.toISOString().slice(0, 10) };
	});
