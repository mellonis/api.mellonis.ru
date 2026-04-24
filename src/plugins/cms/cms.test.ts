import { describe, expect, it, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import type { MySQLPromisePool } from '@fastify/mysql';
import { authPlugin } from '../auth/auth.js';
import { cmsPlugin } from './cms.js';
import { signAccessToken } from '../auth/jwt.js';

const JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long';
const secret = new TextEncoder().encode(JWT_SECRET);

beforeEach(() => {
	vi.stubEnv('JWT_SECRET', JWT_SECRET);
	vi.stubEnv('JWT_ACCESS_TOKEN_TTL', '900');
	vi.stubEnv('JWT_REFRESH_TOKEN_TTL', '2592000');
	vi.stubEnv('ACTIVATION_KEY_TTL', '86400');
	vi.stubEnv('RESET_KEY_TTL', '3600');
});

function createMockMysql(...responses: Record<string, unknown>[][]): MySQLPromisePool {
	let callIndex = 0;

	return {
		getConnection: vi.fn().mockImplementation(() =>
			Promise.resolve({
				query: vi.fn().mockImplementation(() => Promise.resolve([responses[callIndex++] ?? []])),
				beginTransaction: vi.fn().mockResolvedValue(undefined),
				commit: vi.fn().mockResolvedValue(undefined),
				rollback: vi.fn().mockResolvedValue(undefined),
				release: vi.fn(),
			})
		),
	} as unknown as MySQLPromisePool;
}

async function buildApp(mysql: MySQLPromisePool) {
	const app = Fastify({ logger: false });

	app.setValidatorCompiler(validatorCompiler);
	app.setSerializerCompiler(serializerCompiler);
	app.decorate('mysql', mysql);
	app.register(authPlugin);
	app.register(cmsPlugin, { prefix: '/cms' });

	return app;
}

const getEditorToken = async (canEditContent = true) =>
	signAccessToken({
		sub: 1,
		login: 'editor',
		isAdmin: false,
		isEditor: true,
		tokenVersion: 0,
		rights: { canVote: true, canEditContent },
	}, secret);

const getNonEditorToken = async () =>
	signAccessToken({
		sub: 2,
		login: 'user',
		isAdmin: false,
		isEditor: false,
		tokenVersion: 0,
		rights: { canVote: true, canEditContent: false },
	}, secret);

const sectionRow = {
	id: 10,
	identifier: 'nstran',
	title: 'Test Section',
	description: null,
	annotationText: null,
	annotationAuthor: null,
	typeId: 1,
	redirectSectionId: null,
	settings: null,
	order: 1,
};

// --- Auth tests ---

describe('CMS auth', () => {
	it('returns 401 without auth token', async () => {
		const app = await buildApp(createMockMysql());

		const response = await app.inject({ method: 'GET', url: '/cms/sections' });

		expect(response.statusCode).toBe(401);
	});

	it('returns 403 for non-editor user', async () => {
		const app = await buildApp(createMockMysql());
		const token = await getNonEditorToken();

		const response = await app.inject({
			method: 'GET',
			url: '/cms/sections',
			headers: { authorization: `Bearer ${token}` },
		});

		expect(response.statusCode).toBe(403);
		expect(response.json().message).toBe('Editor access required');
	});

	it('allows GET for editor without canEditContent right', async () => {
		const app = await buildApp(createMockMysql([sectionRow]));
		const token = await getEditorToken(false);

		const response = await app.inject({
			method: 'GET',
			url: '/cms/sections',
			headers: { authorization: `Bearer ${token}` },
		});

		expect(response.statusCode).toBe(200);
	});

	it('returns 403 for mutation without canEditContent right', async () => {
		const app = await buildApp(createMockMysql());
		const token = await getEditorToken(false);

		const response = await app.inject({
			method: 'POST',
			url: '/cms/sections',
			headers: { authorization: `Bearer ${token}` },
			payload: { identifier: 'test', title: 'Test', typeId: 1 },
		});

		expect(response.statusCode).toBe(403);
		expect(response.json().message).toBe('Missing required right: canEditContent');
	});
});

// --- Section types ---

describe('GET /cms/section-types', () => {
	it('returns section types', async () => {
		const types = [{ id: 0, title: 'Deprecated' }, { id: 1, title: 'Normal' }];
		const app = await buildApp(createMockMysql(types));
		const token = await getEditorToken();

		const response = await app.inject({
			method: 'GET',
			url: '/cms/section-types',
			headers: { authorization: `Bearer ${token}` },
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual(types);
	});
});

// --- Sections CRUD ---

describe('GET /cms/sections', () => {
	it('returns non-deprecated sections', async () => {
		const app = await buildApp(createMockMysql([sectionRow]));
		const token = await getEditorToken();

		const response = await app.inject({
			method: 'GET',
			url: '/cms/sections',
			headers: { authorization: `Bearer ${token}` },
		});

		expect(response.statusCode).toBe(200);
		const sections = response.json();
		expect(sections).toHaveLength(1);
		expect(sections[0].id).toBe(10);
		expect(sections[0].settings).toBeNull();
	});

	it('maps settings correctly', async () => {
		const row = { ...sectionRow, settings: '{"show_all":true,"things_order":-1}' };
		const app = await buildApp(createMockMysql([row]));
		const token = await getEditorToken();

		const response = await app.inject({
			method: 'GET',
			url: '/cms/sections',
			headers: { authorization: `Bearer ${token}` },
		});

		expect(response.json()[0].settings).toEqual({ showAll: true, reverseOrder: true });
	});

	it('maps default settings to reverseOrder false', async () => {
		const row = { ...sectionRow, settings: '{"show_all":false,"things_order":1}' };
		const app = await buildApp(createMockMysql([row]));
		const token = await getEditorToken();

		const response = await app.inject({
			method: 'GET',
			url: '/cms/sections',
			headers: { authorization: `Bearer ${token}` },
		});

		expect(response.json()[0].settings).toEqual({ showAll: false, reverseOrder: false });
	});
});

describe('POST /cms/sections', () => {
	it('creates a section', async () => {
		// Responses: maxOrder query, insert query, getCmsSectionById query
		const createdRow = { ...sectionRow, id: 99 };
		const app = await buildApp(createMockMysql(
			[{ maxOrder: 5 }],
			[{ insertId: 99 }],
			[createdRow],
		));
		const token = await getEditorToken();

		const response = await app.inject({
			method: 'POST',
			url: '/cms/sections',
			headers: { authorization: `Bearer ${token}` },
			payload: { identifier: 'newsec', title: 'New Section', typeId: 1 },
		});

		expect(response.statusCode).toBe(201);
		expect(response.json().id).toBe(99);
	});

	it('rejects invalid identifier', async () => {
		const app = await buildApp(createMockMysql());
		const token = await getEditorToken();

		const response = await app.inject({
			method: 'POST',
			url: '/cms/sections',
			headers: { authorization: `Bearer ${token}` },
			payload: { identifier: 'INVALID', title: 'Test', typeId: 1 },
		});

		expect(response.statusCode).toBe(400);
	});
});

describe('DELETE /cms/sections/:id', () => {
	it('refuses deletion when section has incoming redirects', async () => {
		// Responses: getCmsSectionById, getExternalRedirectsToSection
		const app = await buildApp(createMockMysql(
			[sectionRow],
			[{ fromSectionId: 2, fromSectionIdentifier: 'stran', fromThingId: 5 }],
		));
		const token = await getEditorToken();

		const response = await app.inject({
			method: 'DELETE',
			url: '/cms/sections/10',
			headers: { authorization: `Bearer ${token}` },
		});

		expect(response.statusCode).toBe(409);
		expect(response.json().error).toContain('incoming redirects');
	});

	it('returns 404 for non-existent section', async () => {
		const app = await buildApp(createMockMysql([]));
		const token = await getEditorToken();

		const response = await app.inject({
			method: 'DELETE',
			url: '/cms/sections/999',
			headers: { authorization: `Bearer ${token}` },
		});

		expect(response.statusCode).toBe(404);
	});
});

// --- Things in section ---

describe('GET /cms/sections/:id/things', () => {
	it('returns things in section', async () => {
		const thingRow = { thingId: 1, position: 1, title: 'Poem', firstLines: 'Line 1\nLine 2' };
		// Responses: getCmsSectionById, getCmsThingsInSection
		const app = await buildApp(createMockMysql([sectionRow], [thingRow]));
		const token = await getEditorToken();

		const response = await app.inject({
			method: 'GET',
			url: '/cms/sections/10/things',
			headers: { authorization: `Bearer ${token}` },
		});

		expect(response.statusCode).toBe(200);
		const things = response.json();
		expect(things).toHaveLength(1);
		expect(things[0].firstLines).toEqual(['Line 1', 'Line 2']);
	});
});

describe('POST /cms/sections/:id/things', () => {
	it('returns 404 when thing does not exist', async () => {
		// Responses: getCmsSectionById, thingExists (empty = not found)
		const app = await buildApp(createMockMysql([sectionRow], []));
		const token = await getEditorToken();

		const response = await app.inject({
			method: 'POST',
			url: '/cms/sections/10/things',
			headers: { authorization: `Bearer ${token}` },
			payload: { thingId: 999 },
		});

		expect(response.statusCode).toBe(404);
		expect(response.json().error).toBe('Thing not found');
	});
});

describe('PUT /cms/sections/:id/things/reorder', () => {
	it('rejects mismatched thing IDs', async () => {
		// Responses: getCmsSectionById, getSectionThingIds
		const app = await buildApp(createMockMysql(
			[sectionRow],
			[{ thingId: 1 }, { thingId: 2 }],
		));
		const token = await getEditorToken();

		const response = await app.inject({
			method: 'PUT',
			url: '/cms/sections/10/things/reorder',
			headers: { authorization: `Bearer ${token}` },
			payload: [1, 3],
		});

		expect(response.statusCode).toBe(400);
		expect(response.json().error).toContain('must match');
	});
});
