import type { FastifyInstance } from 'fastify';
import { getAuthor } from './databaseHelpers.js';
import { authorResponse } from './schemas.js';
import { errorResponse } from '../../lib/schemas.js';

export async function authorPlugin(fastify: FastifyInstance) {
	fastify.log.info('[PLUGIN] Registering: author...');

	fastify.get('/', {
		schema: {
			description: 'Get author information.',
			tags: ['Author'],
			response: {
				200: authorResponse,
				404: errorResponse,
				500: errorResponse,
			},
		},
		handler: async (request, reply) => {
			try {
				const author = await getAuthor(fastify.mysql);

				if (!author) {
					return reply.code(404).send({ error: 'Author information not found' });
				}

				return author;
			} catch (error) {
				request.log.error(error);
				reply.status(500).send({ error: 'Internal server error' });
			}
		},
	});

	fastify.log.info('[PLUGIN] Registered: author');
}
