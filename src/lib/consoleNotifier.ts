import type { FastifyBaseLogger } from 'fastify';
import type { Notifier } from './notifier.js';
import { maskEmail } from './maskEmail.js';

export class ConsoleNotifier implements Notifier {
	private readonly logger: FastifyBaseLogger;

	constructor(logger: FastifyBaseLogger) {
		this.logger = logger;
	}

	async sendActivation(email: string, login: string, key: string): Promise<void> {
		this.logger.info({ login, email: maskEmail(email), key }, '[DEV] Activation key');
	}

	async sendPasswordReset(email: string, login: string, key: string): Promise<void> {
		this.logger.info({ login, email: maskEmail(email), key }, '[DEV] Password reset key');
	}

	async sendPasswordChanged(email: string, login: string): Promise<void> {
		this.logger.info({ login, email: maskEmail(email) }, '[DEV] Password changed notification');
	}
}
