import type { FastifyInstance, FastifyRequest } from 'fastify';
import { searchQuery, searchResponse, type SearchQuery } from './schemas.js';
import { errorResponse } from '../../lib/schemas.js';
import { SEARCH_INDEX_NAME } from './search.js';

export async function searchRoutes(fastify: FastifyInstance) {
	fastify.get<{ Querystring: SearchQuery }>('/', {
		schema: {
			description: 'Full-text search across published things.',
			tags: ['Search'],
			querystring: searchQuery,
			response: {
				200: searchResponse,
				503: errorResponse,
			},
		},
		handler: async (request: FastifyRequest<{ Querystring: SearchQuery }>, reply) => {
			if (!fastify.meiliClient) {
				return reply.code(503).send({ error: 'Search is not available' });
			}

			try {
				const { q, limit, offset } = request.query;

				const result = await fastify.meiliClient.index(SEARCH_INDEX_NAME).search(q, {
					filter: 'statusId = 2',
					limit,
					offset,
					attributesToHighlight: ['title', 'text', 'notes', 'audioTitles'],
					highlightPreTag: '<mark>',
					highlightPostTag: '</mark>',
					attributesToCrop: ['text', 'notes'],
					cropLength: 60,
				});

				return {
					hits: result.hits.map((hit: Record<string, unknown> & { _formatted?: Record<string, unknown> }) => ({
						id: hit.id as number,
						title: (hit._formatted?.title ?? hit.title) as string,
						firstLine: hit.firstLine as string,
						text: (hit._formatted?.text ?? hit.text) as string,
						notes: (hit._formatted?.notes ?? hit.notes) as string,
						audioTitles: (hit._formatted?.audioTitles ?? hit.audioTitles) as string,
						categoryId: hit.categoryId as number,
					})),
					totalHits: result.estimatedTotalHits ?? 0,
					query: q,
				};
			} catch (error) {
				request.log.error(error, 'Search failed');
				return reply.code(500).send({ error: 'Search failed' });
			}
		},
	});
}
