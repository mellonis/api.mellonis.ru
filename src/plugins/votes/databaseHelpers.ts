import type { MySQLPromisePool, MySQLRowDataPacket } from '@fastify/mysql';
import { withConnection } from '../../lib/databaseHelpers.js';
import { upsertVoteQuery, deleteVoteQuery, voteCountsQuery } from './queries.js';

export const upsertVote = async (mysql: MySQLPromisePool, thingId: number, userId: number, vote: number): Promise<void> => {
	await withConnection(mysql, async (connection) => {
		await connection.query(upsertVoteQuery, [thingId, userId, vote]);
	});
};

export const deleteVote = async (mysql: MySQLPromisePool, thingId: number, userId: number): Promise<void> => {
	await withConnection(mysql, async (connection) => {
		await connection.query(deleteVoteQuery, [thingId, userId]);
	});
};

export interface VoteCounts {
	plus: number;
	minus: number;
}

export const getVoteCounts = async (mysql: MySQLPromisePool, thingId: number): Promise<VoteCounts> =>
	withConnection(mysql, async (connection) => {
		const [rows] = await connection.query<MySQLRowDataPacket[]>(voteCountsQuery, [thingId]);
		return { plus: rows[0].plus as number, minus: rows[0].minus as number };
	});
