import type { Meilisearch } from 'meilisearch';
import type { MySQLPromisePool, MySQLRowDataPacket } from '@fastify/mysql';
import type { FastifyBaseLogger } from 'fastify';
import { withConnection } from '../../lib/databaseHelpers.js';
import { prepareText, prepareNotes, extractAudioTitles } from './textStripping.js';
import { SEARCH_INDEX_NAME } from './search.js';

interface ThingSearchDocument {
	id: number;
	title: string;
	firstLine: string;
	text: string;
	notes: string;
	audioTitles: string;
	categoryId: number;
	statusId: number;
}

const thingForSearchQuery = `
	SELECT
		t.id,
		t.title,
		t.first_lines AS firstLines,
		t.text,
		t.r_thing_category_id AS categoryId,
		t.r_thing_status_id   AS statusId,
		ti.text                AS info
	FROM thing t
	LEFT JOIN thing_info ti ON ti.r_thing_id = t.id
	WHERE t.id = ?;
`;

const thingNotesForSearchQuery = `
	SELECT text FROM thing_note WHERE r_thing_id = ? ORDER BY \`order\`, id;
`;

const allThingIdsQuery = `
	SELECT id FROM thing ORDER BY id;
`;

const buildDocument = (
	row: MySQLRowDataPacket,
	noteRows: MySQLRowDataPacket[],
): ThingSearchDocument => ({
	id: row.id as number,
	title: prepareText((row.title as string) ?? ''),
	firstLine: (row.firstLines as string)?.split('\n')[0] ?? '',
	text: prepareText(row.text as string),
	notes: prepareNotes(noteRows.map((n) => ({ text: n.text as string }))),
	audioTitles: extractAudioTitles((row.info as string) ?? null).join('\n'),
	categoryId: row.categoryId as number,
	statusId: row.statusId as number,
});

export const syncThingToSearch = async (
	client: Meilisearch,
	mysql: MySQLPromisePool,
	thingId: number,
	log: FastifyBaseLogger,
): Promise<void> => {
	const document = await withConnection(mysql, async (connection) => {
		const [rows] = await connection.query<MySQLRowDataPacket[]>(thingForSearchQuery, [thingId]);

		if (rows.length === 0) return null;

		const [noteRows] = await connection.query<MySQLRowDataPacket[]>(thingNotesForSearchQuery, [thingId]);
		return buildDocument(rows[0], noteRows);
	});

	if (!document) return;

	await client.index(SEARCH_INDEX_NAME).addDocuments([document]);
	log.info({ thingId }, 'Search index updated');
};

export const deleteThingFromSearch = async (
	client: Meilisearch,
	thingId: number,
	log: FastifyBaseLogger,
): Promise<void> => {
	await client.index(SEARCH_INDEX_NAME).deleteDocument(thingId);
	log.info({ thingId }, 'Search index entry deleted');
};

const BATCH_SIZE = 50;

export const reindexAll = async (
	client: Meilisearch,
	mysql: MySQLPromisePool,
	log: FastifyBaseLogger,
): Promise<number> => {
	const ids = await withConnection(mysql, async (connection) => {
		const [rows] = await connection.query<MySQLRowDataPacket[]>(allThingIdsQuery);
		return rows.map((r) => r.id as number);
	});

	for (let i = 0; i < ids.length; i += BATCH_SIZE) {
		const batch = ids.slice(i, i + BATCH_SIZE);

		const documents = await withConnection(mysql, async (connection) => {
			const results: ThingSearchDocument[] = [];

			for (const id of batch) {
				const [rows] = await connection.query<MySQLRowDataPacket[]>(thingForSearchQuery, [id]);
				if (rows.length === 0) continue;

				const [noteRows] = await connection.query<MySQLRowDataPacket[]>(thingNotesForSearchQuery, [id]);
				results.push(buildDocument(rows[0], noteRows));
			}

			return results;
		});

		if (documents.length > 0) {
			await client.index(SEARCH_INDEX_NAME).addDocuments(documents);
		}

		log.info({ batch: `${i + 1}-${Math.min(i + BATCH_SIZE, ids.length)}`, total: ids.length }, 'Reindex batch complete');
	}

	return ids.length;
};
