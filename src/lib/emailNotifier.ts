import type { FastifyBaseLogger } from 'fastify';
import type { Notifier } from './notifier.js';
import { sendEmail } from './email.js';
import { activationEmail, resetPasswordEmail, passwordChangedEmail } from './emailTemplates.js';
import { maskEmail } from './maskEmail.js';

export class EmailNotifier implements Notifier {
	private readonly siteUrl: string;
	private readonly logger: FastifyBaseLogger;

	constructor(siteUrl: string, logger: FastifyBaseLogger) {
		this.siteUrl = siteUrl;
		this.logger = logger;
	}

	async sendActivation(email: string, login: string, key: string): Promise<void> {
		const href = `${this.siteUrl}/activate/?key=${key}`;
		this.logger.info({ login, email: maskEmail(email) }, 'Sending activation email');
		await sendEmail(email, activationEmail(this.siteUrl, login, href));
	}

	async sendPasswordReset(email: string, login: string, key: string): Promise<void> {
		const href = `${this.siteUrl}/reset-password/?key=${key}`;
		this.logger.info({ login, email: maskEmail(email) }, 'Sending password reset email');
		await sendEmail(email, resetPasswordEmail(this.siteUrl, login, href));
	}

	async sendPasswordChanged(email: string, login: string): Promise<void> {
		const resetHref = `${this.siteUrl}/reset-password/`;
		this.logger.info({ login, email: maskEmail(email) }, 'Sending password changed email');
		await sendEmail(email, passwordChangedEmail(this.siteUrl, login, resetHref));
	}
}
