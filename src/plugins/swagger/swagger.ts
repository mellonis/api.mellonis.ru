import fastifySwagger from '@fastify/swagger';
import { jsonSchemaTransform } from 'fastify-type-provider-zod';
import fastifySwaggerUi from '@fastify/swagger-ui';
import fastifyPlugin from 'fastify-plugin';

const swaggerPlugin = fastifyPlugin(async (fastify) => {
	fastify.log.info('[PLUGIN] Registering: swagger...');

	fastify.register(fastifySwagger, {
		openapi: {
			info: {
				title: 'Documentation for Poetry API',
				version: '2.0.0',
			},
		},
		transform: jsonSchemaTransform,
	});

	fastify.register(fastifySwaggerUi, {
		routePrefix: '/docs',
	});

	fastify.log.info('[PLUGIN] Registered: swagger');
});

export { swaggerPlugin };
