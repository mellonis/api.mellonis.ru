import type { FastifyBaseLogger } from 'fastify';
import type { AuthNotifier } from './AuthNotifier.js';
import { maskEmail } from '../maskEmail.js';

export class ConsoleAuthNotifier implements AuthNotifier {
	private readonly logger: FastifyBaseLogger;

	constructor(logger: FastifyBaseLogger) {
		this.logger = logger;
	}

	async sendActivation(email: string, login: string, key: string, origin: string): Promise<void> {
		this.logger.info({ login, email: maskEmail(email), key, origin }, 'Sending activation email');
	}

	async sendPasswordReset(email: string, login: string, key: string, origin: string): Promise<void> {
		this.logger.info({ login, email: maskEmail(email), key, origin }, 'Sending password reset email');
	}

	async sendPasswordChanged(email: string, login: string, origin: string): Promise<void> {
		this.logger.info({ login, email: maskEmail(email), origin }, 'Sending password changed email');
	}
}
