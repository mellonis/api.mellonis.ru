import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import { sectionsPlugin } from './plugins/sections/sections.js';
import { databasePlugin } from './plugins/database/database.js';
import { swaggerPlugin } from './plugins/swagger/swagger.js';
import { thingsOfTheDayPlugin } from './plugins/thingsOfTheDay/thingsOfTheDay.js';
import { authPlugin } from './plugins/auth/auth.js';
import { authRoutesPlugin } from './plugins/auth/authRoutes.js';
import { usersPlugin } from './plugins/users/users.js';
import { authNotifierPlugin } from './plugins/authNotifier/authNotifier.js';
import { votesPlugin } from './plugins/votes/votes.js';
import { bookmarksPlugin } from './plugins/bookmarks/bookmarks.js';

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean);

const fastify: FastifyInstance = Fastify({
	logger: process.env.NODE_ENV === 'production'
		? true
		: { transport: { target: 'pino-pretty' } },
	genReqId: (req) => (req.headers['x-request-id'] as string) || randomUUID(),
});

fastify.addHook('onSend', async (request, reply) => {
	reply.header('X-Request-Id', request.id);
});

fastify.setValidatorCompiler(validatorCompiler);
fastify.setSerializerCompiler(serializerCompiler);

fastify.register(cors, {
	origin: allowedOrigins,
	methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
	allowedHeaders: ['Content-Type', 'Authorization'],
	credentials: true,
});
fastify.register(databasePlugin);
fastify.register(authPlugin);
fastify.register(authNotifierPlugin);
fastify.register(swaggerPlugin);
fastify.register(sectionsPlugin, { prefix: '/sections' });
fastify.register(thingsOfTheDayPlugin, { prefix: '/things-of-the-day' });
fastify.register(authRoutesPlugin, { prefix: '/auth' });
fastify.register(usersPlugin, { prefix: '/users' });
fastify.register(votesPlugin, { prefix: '/things' });
fastify.register(bookmarksPlugin, { prefix: '/bookmarks' });

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
