import type { MySQLPromisePool, MySQLResultSetHeader, MySQLRowDataPacket } from '@fastify/mysql';
import { withConnection } from '../../lib/databaseHelpers.js';
import { parseJSON, splitLines } from '../../lib/mappers.js';
import {
	sectionTypesQuery,
	sectionStatusesQuery,
	cmsSectionsQuery,
	cmsSectionByIdQuery,
	createSectionQuery,
	updateSectionQuery,
	deleteSectionQuery,
	deleteAllThingsInSectionQuery,
	externalRedirectsToSectionQuery,
	updateSectionOrderQuery,
	shiftSectionOrdersQuery,
	maxSectionOrderQuery,
	allSectionRedirectsQuery,
	cmsSectionThingsQuery,
	addThingToSectionQuery,
	maxThingPositionQuery,
	shiftThingPositionsQuery,
	removeThingFromSectionQuery,
	updateThingPositionQuery,
	thingExistsQuery,
	sectionThingIdsQuery,
	allThingsQuery,
} from './queries.js';

// --- Settings mapping ---

interface DbSettings { show_all?: boolean; things_order?: number }
interface ApiSettings { showAll: boolean; reverseOrder: boolean }

const dbSettingsToApi = (json: string | null): ApiSettings | null => {
	const parsed = parseJSON(json) as DbSettings | undefined;
	if (!parsed) return null;
	return {
		showAll: parsed.show_all ?? false,
		reverseOrder: (parsed.things_order ?? 1) < 0,
	};
};

const apiSettingsToDb = (settings: ApiSettings | null | undefined): string | null => {
	if (!settings) return null;
	if (!settings.showAll && !settings.reverseOrder) return null;
	const db: DbSettings = {};
	if (settings.showAll) db.show_all = true;
	if (settings.reverseOrder) db.things_order = -1;
	return JSON.stringify(db);
};

// --- Section row mapper ---

export interface CmsSection {
	id: number;
	identifier: string;
	title: string;
	description: string | null;
	annotationText: string | null;
	annotationAuthor: string | null;
	typeId: number;
	statusId: number;
	redirectSectionId: number | null;
	settings: ApiSettings | null;
	order: number;
}

const mapCmsSectionRow = (row: MySQLRowDataPacket): CmsSection => ({
	id: row.id as number,
	identifier: row.identifier as string,
	title: row.title as string,
	description: (row.description as string) ?? null,
	annotationText: (row.annotationText as string) ?? null,
	annotationAuthor: (row.annotationAuthor as string) ?? null,
	typeId: row.typeId as number,
	statusId: row.statusId as number,
	redirectSectionId: (row.redirectSectionId as number) ?? null,
	settings: dbSettingsToApi(row.settings as string | null),
	order: row.order as number,
});

// --- Section types ---

export interface SectionType {
	id: number;
	title: string;
}

export const getSectionTypes = async (mysql: MySQLPromisePool): Promise<SectionType[]> =>
	withConnection(mysql, async (connection) => {
		const [rows] = await connection.query<MySQLRowDataPacket[]>(sectionTypesQuery);
		return rows.map((row) => ({ id: row.id as number, title: row.title as string }));
	});

export const getSectionStatuses = async (mysql: MySQLPromisePool): Promise<SectionType[]> =>
	withConnection(mysql, async (connection) => {
		const [rows] = await connection.query<MySQLRowDataPacket[]>(sectionStatusesQuery);
		return rows.map((row) => ({ id: row.id as number, title: row.title as string }));
	});

// --- Sections CRUD ---

export const getCmsSections = async (mysql: MySQLPromisePool): Promise<CmsSection[]> =>
	withConnection(mysql, async (connection) => {
		const [rows] = await connection.query<MySQLRowDataPacket[]>(cmsSectionsQuery);
		return rows.map(mapCmsSectionRow);
	});

export const getCmsSectionById = async (mysql: MySQLPromisePool, id: number): Promise<CmsSection | null> =>
	withConnection(mysql, async (connection) => {
		const [rows] = await connection.query<MySQLRowDataPacket[]>(cmsSectionByIdQuery, [id]);
		return rows.length > 0 ? mapCmsSectionRow(rows[0]) : null;
	});

export const createSection = async (
	mysql: MySQLPromisePool,
	data: { identifier: string; title: string; description: string | null; annotationText: string | null; annotationAuthor: string | null; typeId: number; statusId?: number; redirectSectionId: number | null; settings: ApiSettings | null; order?: number },
): Promise<number> =>
	withConnection(mysql, async (connection) => {
		await connection.beginTransaction();
		try {
			let order: number;

			if (data.order !== undefined) {
				await connection.query(shiftSectionOrdersQuery, [data.order]);
				order = data.order;
			} else {
				const [rows] = await connection.query<MySQLRowDataPacket[]>(maxSectionOrderQuery);
				order = (rows[0].maxOrder as number) + 1;
			}

			const [result] = await connection.query<MySQLResultSetHeader>(createSectionQuery, [
				data.identifier,
				data.title,
				data.description,
				data.annotationText,
				data.annotationAuthor,
				data.typeId,
				data.statusId ?? 1,
				data.redirectSectionId,
				apiSettingsToDb(data.settings),
				order,
			]);

			await connection.commit();
			return result.insertId;
		} catch (error) {
			await connection.rollback();
			throw error;
		}
	});

export const updateSection = async (
	mysql: MySQLPromisePool,
	id: number,
	data: { title?: string; description?: string | null; annotationText?: string | null; annotationAuthor?: string | null; typeId?: number; statusId?: number; redirectSectionId?: number | null; settings?: ApiSettings | null; order?: number },
	current: CmsSection,
): Promise<void> =>
	withConnection(mysql, async (connection) => {
		await connection.beginTransaction();
		try {
			await connection.query(updateSectionQuery, [
				data.title ?? current.title,
				data.description !== undefined ? data.description : current.description,
				data.annotationText !== undefined ? data.annotationText : current.annotationText,
				data.annotationAuthor !== undefined ? data.annotationAuthor : current.annotationAuthor,
				data.typeId ?? current.typeId,
				data.statusId ?? current.statusId,
				data.redirectSectionId !== undefined ? data.redirectSectionId : current.redirectSectionId,
				data.settings !== undefined ? apiSettingsToDb(data.settings) : apiSettingsToDb(current.settings),
				id,
			]);

			if (data.order !== undefined && data.order !== current.order) {
				await connection.query(shiftSectionOrdersQuery, [data.order]);
				await connection.query(updateSectionOrderQuery, [data.order, id]);
			}

			await connection.commit();
		} catch (error) {
			await connection.rollback();
			throw error;
		}
	});

export interface ExternalRedirect {
	fromSectionId: number;
	fromSectionIdentifier: string;
	fromThingId: number;
}

export const getExternalRedirectsToSection = async (mysql: MySQLPromisePool, sectionId: number): Promise<ExternalRedirect[]> =>
	withConnection(mysql, async (connection) => {
		const [rows] = await connection.query<MySQLRowDataPacket[]>(externalRedirectsToSectionQuery, [sectionId, sectionId]);
		return rows.map((r) => ({
			fromSectionId: r.fromSectionId as number,
			fromSectionIdentifier: r.fromSectionIdentifier as string,
			fromThingId: r.fromThingId as number,
		}));
	});

export const deleteSection = async (mysql: MySQLPromisePool, id: number): Promise<void> => {
	await withConnection(mysql, async (connection) => {
		await connection.beginTransaction();
		try {
			await connection.query(deleteAllThingsInSectionQuery, [id]);
			await connection.query(deleteSectionQuery, [id]);
			await connection.commit();
		} catch (error) {
			await connection.rollback();
			throw error;
		}
	});
};

// --- Redirect loop detection ---

export const hasRedirectLoop = async (mysql: MySQLPromisePool, editedSectionId: number, targetRedirectId: number): Promise<boolean> =>
	withConnection(mysql, async (connection) => {
		const [rows] = await connection.query<MySQLRowDataPacket[]>(allSectionRedirectsQuery);
		const redirectMap = new Map(rows.map((r) => [r.id as number, r.redirectSectionId as number | null]));

		let current: number | null = targetRedirectId;
		const visited = new Set<number>();

		while (current !== null) {
			if (current === editedSectionId) return true;
			if (visited.has(current)) return false;
			visited.add(current);
			current = redirectMap.get(current) ?? null;
		}

		return false;
	});

// --- Section reorder ---

export const reorderSections = async (mysql: MySQLPromisePool, sectionIds: number[]): Promise<void> => {
	await withConnection(mysql, async (connection) => {
		await connection.beginTransaction();
		try {
			for (let i = 0; i < sectionIds.length; i++) {
				await connection.query(updateSectionOrderQuery, [i + 1, sectionIds[i]]);
			}
			await connection.commit();
		} catch (error) {
			await connection.rollback();
			throw error;
		}
	});
};

// --- Things in section ---

export interface CmsThingItem {
	thingId: number;
	title: string | null;
	firstLines: string[] | null;
}

export interface CmsSectionThing extends CmsThingItem {
	position: number;
}

const mapCmsThingRow = (row: MySQLRowDataPacket): CmsThingItem => ({
	thingId: row.thingId as number,
	title: (row.title as string) ?? null,
	firstLines: row.firstLines
		? splitLines(row.firstLines as string)
		: null,
});

const mapCmsSectionThingRow = (row: MySQLRowDataPacket): CmsSectionThing => ({
	...mapCmsThingRow(row),
	position: row.position as number,
});

export const getCmsThingsInSection = async (mysql: MySQLPromisePool, sectionId: number): Promise<CmsSectionThing[]> =>
	withConnection(mysql, async (connection) => {
		const [rows] = await connection.query<MySQLRowDataPacket[]>(cmsSectionThingsQuery, [sectionId]);
		return rows.map(mapCmsSectionThingRow);
	});

export const addThingToSection = async (mysql: MySQLPromisePool, sectionId: number, thingId: number, position?: number): Promise<void> => {
	await withConnection(mysql, async (connection) => {
		await connection.beginTransaction();
		try {
			let pos: number;

			if (position !== undefined) {
				await connection.query(shiftThingPositionsQuery, [sectionId, position]);
				pos = position;
			} else {
				const [rows] = await connection.query<MySQLRowDataPacket[]>(maxThingPositionQuery, [sectionId]);
				pos = (rows[0].maxPosition as number) + 1;
			}

			await connection.query(addThingToSectionQuery, [sectionId, pos, thingId]);
			await connection.commit();
		} catch (error) {
			await connection.rollback();
			throw error;
		}
	});
};

export const removeThingFromSection = async (mysql: MySQLPromisePool, sectionId: number, thingId: number): Promise<void> => {
	await withConnection(mysql, async (connection) => {
		await connection.query(removeThingFromSectionQuery, [sectionId, thingId]);
	});
};

export const reorderThingsInSection = async (mysql: MySQLPromisePool, sectionId: number, thingIds: number[]): Promise<void> => {
	await withConnection(mysql, async (connection) => {
		await connection.beginTransaction();
		try {
			const offset = 10000;

			// Phase 1: move to high offset to avoid unique constraint conflicts
			for (let i = 0; i < thingIds.length; i++) {
				await connection.query(updateThingPositionQuery, [offset + i + 1, sectionId, thingIds[i]]);
			}

			// Phase 2: set final positions
			for (let i = 0; i < thingIds.length; i++) {
				await connection.query(updateThingPositionQuery, [i + 1, sectionId, thingIds[i]]);
			}

			await connection.commit();
		} catch (error) {
			await connection.rollback();
			throw error;
		}
	});
};

export const thingExists = async (mysql: MySQLPromisePool, thingId: number): Promise<boolean> =>
	withConnection(mysql, async (connection) => {
		const [rows] = await connection.query<MySQLRowDataPacket[]>(thingExistsQuery, [thingId]);
		return rows.length > 0;
	});

export const getSectionThingIds = async (mysql: MySQLPromisePool, sectionId: number): Promise<number[]> =>
	withConnection(mysql, async (connection) => {
		const [rows] = await connection.query<MySQLRowDataPacket[]>(sectionThingIdsQuery, [sectionId]);
		return rows.map((row) => row.thingId as number);
	});

export const getAllThings = async (mysql: MySQLPromisePool): Promise<CmsThingItem[]> =>
	withConnection(mysql, async (connection) => {
		const [rows] = await connection.query<MySQLRowDataPacket[]>(allThingsQuery);
		return rows.map(mapCmsThingRow);
	});
