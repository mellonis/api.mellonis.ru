import Fastify, { FastifyInstance } from 'fastify';
import { sectionsPlugin } from './plugins/sections/sections.js';
import fastifyMySQL, { MySQLPromisePool } from '@fastify/mysql';

const fastify: FastifyInstance = Fastify({
	logger: {
		transport: {
			target: 'pino-pretty',
		},
	},
});

//TODO: move mysql to databasePlugin
declare module 'fastify' {
	interface FastifyInstance {
		mysql: MySQLPromisePool;
	}
}

fastify.register(fastifyMySQL, {
	promise: true,
	connectionString: process.env.CONNECTION_STRING,
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
