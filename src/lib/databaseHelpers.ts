import type { MySQLPromisePool } from '@fastify/mysql';

export const withConnection = async <T>(
	mysql: MySQLPromisePool,
	fn: (connection: Awaited<ReturnType<MySQLPromisePool['getConnection']>>) => Promise<T>,
): Promise<T> => {
	const connection = await mysql.getConnection();

	try {
		await connection.query("SET time_zone = '+03:00'");
		return await fn(connection);
	} finally {
		connection.release();
	}
};
