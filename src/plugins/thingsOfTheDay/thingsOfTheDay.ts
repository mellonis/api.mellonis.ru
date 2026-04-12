import type { FastifyInstance } from 'fastify';
import { getThingsOfTheDay } from './databaseHelpers.js';
import { thingsOfTheDayResponse } from './schemas.js';
import { errorResponse } from '../../lib/schemas.js';

export async function thingsOfTheDayPlugin(fastify: FastifyInstance) {
	fastify.log.info('[PLUGIN] Registering: thingsOfTheDay...');

	fastify.get('/', {
		schema: {
			response: {
				200: thingsOfTheDayResponse,
				500: errorResponse,
			},
		}, handler: async (_request, reply) => {
			try {
				return await getThingsOfTheDay(fastify.mysql);
			} catch (error) {
				fastify.log.error(error);
				reply.status(500).send({ error: 'Internal server error' });
			}
		},
	});

	fastify.log.info('[PLUGIN] Registered: thingsOfTheDay');
}
