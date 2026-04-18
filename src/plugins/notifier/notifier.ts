import type { FastifyInstance } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import type { Notifier } from '../../lib/notifier.js';
import { EmailNotifier } from '../../lib/emailNotifier.js';
import { ConsoleNotifier } from '../../lib/consoleNotifier.js';

declare module 'fastify' {
	interface FastifyInstance {
		notifier: Notifier;
	}
}

const notifierPlugin = fastifyPlugin(async (fastify: FastifyInstance) => {
	fastify.log.info('[PLUGIN] Registering: notifier...');

	const siteUrl = process.env.SITE_URL;

	if (!siteUrl) {
		throw new Error('SITE_URL environment variable is not set');
	}

	const notifier: Notifier = process.env.NODE_ENV === 'production'
		? new EmailNotifier(siteUrl, fastify.log)
		: new ConsoleNotifier(fastify.log);

	fastify.decorate('notifier', notifier);

	fastify.log.info(`[PLUGIN] Registered: notifier (${notifier.constructor.name})`);
});

export { notifierPlugin };
