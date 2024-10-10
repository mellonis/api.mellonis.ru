import { FastifyInstance, FastifyRequest } from 'fastify';
import { addSchemas } from './schemas.js';
import { getSections, getSectionThings, getThingsNotes } from './databaseHelpers.js';

export async function sectionsPlugin(fastify: FastifyInstance) {
	fastify.log.info('[PLUGIN] Registering: sections...');

	addSchemas(fastify);

	fastify.get('/', {
		schema: {
			response: {
				200: { $ref: 'sectionsResponse' },
			},
		},
		handler: async (_request, reply) => {
			return getSections(fastify.mysql)
				.catch((error) => {
					reply.send(error);
				});
		},
	});

	fastify.get('/:id', {
		schema: {
			params: {
				type: 'object',
				properties: {
					id: { type: 'string' },
				},
				required: ['id'],
			},
			response: {
				200: { $ref: 'sectionThingsResponse' },
			},
		},
		handler: async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
			const section = await getSections(fastify.mysql)
				.then((sections) => sections.find(({ id: sectionId }) => sectionId === request.params.id));

			if (!section) {
				return reply.code(404).send();
			}

			const things = await getSectionThings(fastify.mysql, request.params.id);

			const ids = things.map(({ id }) => id);

			if (!ids.length) {
				return things;
			}

			const thingIdToNotesMap = await getThingsNotes(fastify.mysql, ids);

			if (thingIdToNotesMap.size === 0) {
				return things;
			}

			return things.map((thing) => ({
				...thing,
				notes: thingIdToNotesMap.get(thing.id),
			}));
		},
	});

	fastify.log.info('[PLUGIN] Registered: sections');
}
