import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { errorResponse } from '../../lib/schemas.js';
import { authErrorResponse } from '../auth/schemas.js';
import { requireCanEditContent } from './hooks.js';
import { reindexAll } from '../search/searchSync.js';

export async function searchCmsRoutes(fastify: FastifyInstance) {
	fastify.post('/search/reindex', {
		onRequest: requireCanEditContent,
		schema: {
			description: 'Reindex all things in Meilisearch.',
			tags: ['CMS'],
			response: {
				200: z.object({ indexed: z.number().int() }),
				401: authErrorResponse,
				403: authErrorResponse,
				503: errorResponse,
				500: errorResponse,
			},
		},
		handler: async (request, reply) => {
			if (!fastify.meiliClient) {
				return reply.code(503).send({ error: 'Search is not available' });
			}

			try {
				const count = await reindexAll(fastify.meiliClient, fastify.mysql, request.log);
				request.log.info({ count }, 'Full reindex complete');
				return { indexed: count };
			} catch (error) {
				request.log.error(error, 'Reindex failed');
				return reply.code(500).send({ error: 'Reindex failed' });
			}
		},
	});
}
