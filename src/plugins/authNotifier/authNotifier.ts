import type { FastifyInstance, FastifyRequest } from 'fastify';
import fastifyPlugin from 'fastify-plugin';
import type { AuthNotifier } from '../../lib/authNotifier/AuthNotifier.js';
import { EmailAuthNotifier } from '../../lib/authNotifier/EmailAuthNotifier.js';
import { ConsoleAuthNotifier } from '../../lib/authNotifier/ConsoleAuthNotifier.js';

declare module 'fastify' {
	interface FastifyInstance {
		authNotifier: AuthNotifier;
		resolveOrigin: (request: FastifyRequest) => string;
	}
}

const authNotifierPlugin = fastifyPlugin(async (fastify: FastifyInstance) => {
	fastify.log.info('[PLUGIN] Registering: authNotifier...');

	const allowedOriginsEnv = process.env.ALLOWED_ORIGINS;

	if (!allowedOriginsEnv) {
		throw new Error('ALLOWED_ORIGINS environment variable is not set');
	}

	const allowedOrigins = allowedOriginsEnv.split(',').map((o) => o.trim()).filter(Boolean);

	if (allowedOrigins.length === 0) {
		throw new Error('ALLOWED_ORIGINS must contain at least one origin');
	}

	const defaultOrigin = allowedOrigins[0];

	fastify.decorate('resolveOrigin', (request: FastifyRequest): string => {
		const origin = request.headers.origin;

		if (origin && allowedOrigins.includes(origin)) {
			return origin;
		}

		return defaultOrigin;
	});

	const notifier: AuthNotifier = process.env.NODE_ENV === 'production'
		? new EmailAuthNotifier(fastify.log)
		: new ConsoleAuthNotifier(fastify.log);

	fastify.decorate('authNotifier', notifier);

	fastify.log.info(`[PLUGIN] Registered: authNotifier (${notifier.constructor.name}, origins: ${allowedOrigins.join(', ')})`);
});

export { authNotifierPlugin };
