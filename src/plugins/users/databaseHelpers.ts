import type { MySQLPromisePool, MySQLRowDataPacket } from '@fastify/mysql';
import { withConnection } from '../../lib/databaseHelpers.js';
import {
	getUserPasswordAndEmailQuery,
	updatePasswordQuery,
	deleteUserQuery,
} from './queries.js';

export interface UserCredentials {
	passwordHash: string;
	email: string;
}

export const getUserCredentials = async (mysql: MySQLPromisePool, userId: number): Promise<UserCredentials | null> =>
	withConnection(mysql, async (connection) => {
		const [rows] = await connection.query<MySQLRowDataPacket[]>(getUserPasswordAndEmailQuery, [userId]);
		return rows.length > 0 ? { passwordHash: rows[0].password_hash, email: rows[0].email } : null;
	});

export const updatePassword = async (mysql: MySQLPromisePool, userId: number, passwordHash: string): Promise<void> => {
	await withConnection(mysql, async (connection) => {
		await connection.query(updatePasswordQuery, [passwordHash, userId]);
	});
};

// Vote anonymization happens via DB-level ON DELETE SET NULL on vote.r_user_id —
// no app-level cleanup needed. Refresh tokens cascade-delete the same way.
export const deleteUser = async (mysql: MySQLPromisePool, userId: number): Promise<void> => {
	await withConnection(mysql, async (connection) => {
		await connection.query(deleteUserQuery, [userId]);
	});
};
