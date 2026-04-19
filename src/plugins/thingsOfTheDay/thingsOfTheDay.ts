import type { FastifyInstance } from 'fastify';
import { getThingsOfTheDay } from './databaseHelpers.js';
import { thingsOfTheDayResponse } from './schemas.js';
import { errorResponse } from '../../lib/schemas.js';

export async function thingsOfTheDayPlugin(fastify: FastifyInstance) {
	fastify.log.info('[PLUGIN] Registering: thingsOfTheDay...');

	fastify.addHook('onRequest', fastify.optionalVerifyJwt);

	fastify.get('/', {
		schema: {
			description: 'Get things matching today\'s date, or a random daily selection as fallback.',
			tags: ['Things of the Day'],
			response: {
				200: thingsOfTheDayResponse,
				500: errorResponse,
			},
		}, handler: async (request, reply) => {
			try {
				const userId = request.user?.sub;

				return await getThingsOfTheDay(fastify.mysql, userId);
			} catch (error) {
				request.log.error(error);
				reply.status(500).send({ error: 'Internal server error' });
			}
		},
	});

	fastify.log.info('[PLUGIN] Registered: thingsOfTheDay');
}
