import type { FastifyInstance } from 'fastify';
import Fastify from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { sectionsPlugin } from './plugins/sections/sections.js';
import { databasePlugin } from './plugins/database/database.js';
import { swaggerPlugin } from './plugins/swagger/swagger.js';
import { thingsOfTheDayPlugin } from './plugins/thingsOfTheDay/thingsOfTheDay.js';
import { authPlugin } from './plugins/auth/auth.js';
import { authRoutesPlugin } from './plugins/auth/authRoutes.js';
import { usersPlugin } from './plugins/users/users.js';
import { authNotifierPlugin } from './plugins/authNotifier/authNotifier.js';

const fastify: FastifyInstance = Fastify({
	logger: process.env.NODE_ENV === 'production'
		? true
		: { transport: { target: 'pino-pretty' } },
});

fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);

fastify.register(databasePlugin);
fastify.register(authPlugin);
fastify.register(authNotifierPlugin);
fastify.register(swaggerPlugin);
fastify.register(sectionsPlugin, { prefix: '/sections' });
fastify.register(thingsOfTheDayPlugin, { prefix: '/things-of-the-day' });
fastify.register(authRoutesPlugin, { prefix: '/auth' });
fastify.register(usersPlugin, { prefix: '/users' });

async function main() {
	await fastify.listen({
		host: '0.0.0.0',
		port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
	});
}

['SIGINT', 'SIGTERM'].forEach((signal) => {
	process.on(signal, async () => {
		await fastify.close();

		process.exit(0);
	});
});

main()
	.catch((error) => {
		fastify.log.error(error);
		process.exit(1);
	});
