import Fastify, { FastifyInstance } from 'fastify';
import fastifyMySQL, { MySQLPromisePool } from '@fastify/mysql';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { jsonSchemaTransform, serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { sectionsPlugin } from './plugins/sections/sections.js';

const fastify: FastifyInstance = Fastify({
	logger: {
		transport: {
			target: 'pino-pretty',
		},
	},
});

fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);

declare module 'fastify' {
	interface FastifyInstance {
		mysql: MySQLPromisePool;
	}
}

fastify.register(fastifyMySQL, {
	promise: true,
	connectionString: process.env.CONNECTION_STRING,
});

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

fastify.register(sectionsPlugin, { prefix: '/sections' });

async function main() {
	await fastify.listen({
		host: '0.0.0.0',
		port: 3000,
	});
}

['SIGINT', 'SIGTERM'].forEach((signal) => {
	process.on(signal, async () => {
		await fastify.close();

		process.exit(0);
	});
});

main();
