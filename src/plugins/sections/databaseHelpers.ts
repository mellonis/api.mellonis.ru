import type { MySQLPromisePool, MySQLRowDataPacket } from '@fastify/mysql';
import { sectionByIdQuery, sectionsQuery, sectionThingsQuery, sectionThingsWithUserVoteQuery } from './queries.js';
import type { Section, Thing } from './schemas.js';
import { mapThingBaseRow, parseJSON } from '../../lib/mappers.js';
import { withConnection } from '../../lib/databaseHelpers.js';

type SectionSettings = { show_all?: boolean; things_order?: 1 | 0 | -1 };

const parseSettings = (settings: string | null): SectionSettings =>
	(parseJSON(settings) as SectionSettings) ?? {};

const mapSectionRow = ({ id, typeId, title, description, settings, thingsCount }: MySQLRowDataPacket): Section => {
	const { show_all: showAll = false, things_order: thingsOrder = 1 } = parseSettings(settings);

	return {
		id,
		typeId,
		title,
		description: description ?? undefined,
		settings: { showAll, thingsOrder },
		thingsCount,
	};
};

export const getSections = async (mysql: MySQLPromisePool): Promise<Section[]> =>
	withConnection(mysql, async (connection) => {
		const [sections] = await connection.query<MySQLRowDataPacket[]>(sectionsQuery);

		return sections.map(mapSectionRow);
	});

export const getSectionById = async (mysql: MySQLPromisePool, id: string): Promise<Section | null> =>
	withConnection(mysql, async (connection) => {
		const [rows] = await connection.query<MySQLRowDataPacket[]>(sectionByIdQuery, [id]);

		if (rows.length === 0) {
			return null;
		}

		return mapSectionRow(rows[0]);
	});

const mapThingRow = (row: MySQLRowDataPacket): Thing => ({
	...mapThingBaseRow(row),
	position: row.position,
});

export const getSectionThings = async (mysql: MySQLPromisePool, id: string, userId?: number): Promise<Thing[]> =>
	withConnection(mysql, async (connection) => {
		if (userId) {
			const [things] = await connection.query<MySQLRowDataPacket[]>(sectionThingsWithUserVoteQuery, [userId, id]);

			return things.map(mapThingRow);
		}

		const [things] = await connection.query<MySQLRowDataPacket[]>(sectionThingsQuery, [id]);

		return things.map(mapThingRow);
	});
