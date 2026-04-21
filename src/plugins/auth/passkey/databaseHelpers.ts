import type { MySQLPromisePool, MySQLResultSetHeader, MySQLRowDataPacket } from '@fastify/mysql';
import { withConnection } from '../../../lib/databaseHelpers.js';
import {
	insertPasskeyQuery,
	findPasskeysByUserIdQuery,
	findPasskeyByCredentialIdQuery,
	updatePasskeyCounterQuery,
	deletePasskeyQuery,
} from './queries.js';

export interface PasskeyRow {
	id: number;
	credentialId: string;
	publicKey: Buffer;
	counter: number;
	transports: string[] | null;
	name: string;
	createdAt: Date;
	lastUsedAt: Date | null;
}

export interface PasskeyWithUserRow extends PasskeyRow {
	userId: number;
	login: string;
	userRights: number;
	groupId: number;
	groupRights: number;
	tokenVersion: number;
}

const mapPasskeyRow = (row: MySQLRowDataPacket): PasskeyRow => ({
	id: row.id,
	credentialId: row.credential_id,
	publicKey: row.public_key,
	counter: row.counter,
	transports: row.transports ?? null,
	name: row.name,
	createdAt: row.created_at,
	lastUsedAt: row.last_used_at ?? null,
});

const mapPasskeyWithUserRow = (row: MySQLRowDataPacket): PasskeyWithUserRow => ({
	id: row.passkey_id,
	credentialId: row.credential_id,
	publicKey: row.public_key,
	counter: row.counter,
	transports: row.transports ?? null,
	name: row.name,
	createdAt: row.created_at ?? new Date(),
	lastUsedAt: row.last_used_at ?? null,
	userId: row.user_id,
	login: row.user_login,
	userRights: row.user_rights,
	groupId: row.group_id,
	groupRights: row.group_rights,
	tokenVersion: row.token_version,
});

export const createPasskey = async (
	mysql: MySQLPromisePool,
	userId: number,
	credentialId: string,
	publicKey: Buffer,
	counter: number,
	transports: string[] | null,
	name: string,
): Promise<number> =>
	withConnection(mysql, async (connection) => {
		const [result] = await connection.query<MySQLResultSetHeader>(
			insertPasskeyQuery,
			[userId, credentialId, publicKey, counter, transports ? JSON.stringify(transports) : null, name],
		);
		return result.insertId;
	});

export const findPasskeysByUserId = async (
	mysql: MySQLPromisePool,
	userId: number,
): Promise<PasskeyRow[]> =>
	withConnection(mysql, async (connection) => {
		const [rows] = await connection.query<MySQLRowDataPacket[]>(findPasskeysByUserIdQuery, [userId]);
		return rows.map(mapPasskeyRow);
	});

export const findPasskeyByCredentialId = async (
	mysql: MySQLPromisePool,
	credentialId: string,
): Promise<PasskeyWithUserRow | null> =>
	withConnection(mysql, async (connection) => {
		const [rows] = await connection.query<MySQLRowDataPacket[]>(findPasskeyByCredentialIdQuery, [credentialId]);
		return rows.length > 0 ? mapPasskeyWithUserRow(rows[0]) : null;
	});

export const updatePasskeyCounter = async (
	mysql: MySQLPromisePool,
	passkeyId: number,
	newCounter: number,
): Promise<void> => {
	await withConnection(mysql, async (connection) => {
		await connection.query(updatePasskeyCounterQuery, [newCounter, passkeyId]);
	});
};

export const deletePasskey = async (
	mysql: MySQLPromisePool,
	passkeyId: number,
	userId: number,
): Promise<boolean> =>
	withConnection(mysql, async (connection) => {
		const [result] = await connection.query<MySQLResultSetHeader>(deletePasskeyQuery, [passkeyId, userId]);
		return result.affectedRows > 0;
	});
