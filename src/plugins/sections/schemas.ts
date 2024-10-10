import { FastifyInstance } from 'fastify';

export const addSchemas = (fastify: FastifyInstance) => {
	fastify.addSchema(({
		$id: 'sectionsResponse',
		type: 'array',
		items: {
			type: 'object',
			properties: {
				id: { type: 'string' },
				typId: { type: 'number', enum: [1, 2, 3] },
				title: { type: 'string' },
				description: { type: 'string' },
				settings: {
					type: 'object',
					properties: {
						showAll: { type: 'boolean' },
						thingsOrder: { type: 'number', enum: [-1, 1] },
					},
					additionalProperties: false,
					required: ['showAll', 'thingsOrder'],
				},
				thingsCount: { type: 'number', minimum: 0 },
			},
			additionalProperties: false,
			required: ['id', 'typeId', 'title', 'settings', 'thingsCount'],
		},
	}));

	fastify.addSchema(({
		$id: 'sectionThingsResponse',
		type: 'array',
		items: {
			type: 'object',
			properties: {
				id: { type: 'number' },
				position: { type: 'number' },
				categoryId: { type: 'number', enum: [1, 2, 3, 4] },
				title: { type: 'string' },
				firstLines: { type: 'array', items: { type: 'string' } },
				startDate: { type: 'string' },
				finishDate: { type: 'string' },
				text: { type: 'string' },
				notes: { type: 'array', items: { type: 'string' } },
			},
			additionalProperties: false,
			required: ['id', 'position', 'categoryId', 'finishDate', 'text'],
		},
	}));
};
