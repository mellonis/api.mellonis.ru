import type { MySQLPromisePool } from '@fastify/mysql';

export const withConnection = async <T>(
	mysql: MySQLPromisePool,
	fn: (connection: Awaited<ReturnType<MySQLPromisePool['getConnection']>>) => Promise<T>,
): Promise<T> => {
	const connection = await mysql.getConnection();

	try {
		return await fn(connection);
	} finally {
		connection.release();
	}
};
