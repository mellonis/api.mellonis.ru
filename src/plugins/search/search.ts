import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { Meilisearch } from 'meilisearch';

declare module 'fastify' {
	interface FastifyInstance {
		meiliClient: Meilisearch | null;
	}
}

const INDEX_NAME = 'things';

export { INDEX_NAME as SEARCH_INDEX_NAME };

export default fp(async (fastify: FastifyInstance) => {
	const masterKey = process.env.MEILI_MASTER_KEY;

	if (!masterKey) {
		fastify.log.warn('MEILI_MASTER_KEY not set — search is disabled');
		fastify.decorate('meiliClient', null);
		return;
	}

	const url = process.env.MEILI_URL ?? 'http://poetry-meilisearch:7700';
	const client = new Meilisearch({ host: url, apiKey: masterKey });

	await client.createIndex(INDEX_NAME, { primaryKey: 'id' }).catch(() => {});

	const index = client.index(INDEX_NAME);
	await index.updateSettings({
		searchableAttributes: ['title', 'text', 'notes', 'audioTitles'],
		filterableAttributes: ['categoryId', 'statusId'],
	});

	fastify.decorate('meiliClient', client);
	fastify.log.info({ url }, 'Meilisearch connected');
}, { name: 'search' });
