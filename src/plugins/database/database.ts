import fastifyMySQL, { MySQLPromisePool } from '@fastify/mysql';
import fastifyPlugin from 'fastify-plugin';

declare module 'fastify' {
	interface FastifyInstance {
		mysql: MySQLPromisePool;
	}
}

const databasePlugin = fastifyPlugin(async (fastify) => {
	fastify.log.info('[PLUGIN] Registering: database...');

	if (!process.env.CONNECTION_STRING) {
		throw new Error('CONNECTION_STRING environment variable is not set');
	}

	await fastify.register(fastifyMySQL, {
		promise: true,
		connectionString: process.env.CONNECTION_STRING,
	});

	await fastify.after();

	fastify.log.info('[PLUGIN] Registered: database');
});

export { databasePlugin };
