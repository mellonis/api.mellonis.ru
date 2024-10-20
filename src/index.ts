import Fastify, { FastifyInstance } from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { sectionsPlugin } from './plugins/sections/sections.js';
import { databasePlugin } from './plugins/database/database.js';
import { swaggerPlugin } from './plugins/swagger/swagger.js';

const fastify: FastifyInstance = Fastify({
	logger: {
		transport: {
			target: 'pino-pretty',
		},
	},
});

fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);

fastify.register(databasePlugin);
fastify.register(swaggerPlugin);
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

main()
	.catch(() => {
		process.exit(1);
	});
