import { createTransport, type Transporter } from 'nodemailer';

let transporter: Transporter | null = null;

const getTransporter = (): Transporter => {
	if (!transporter) {
		const host = process.env.SMTP_HOST;
		const port = process.env.SMTP_PORT;
		const user = process.env.SMTP_USER;
		const pass = process.env.SMTP_PASS;

		if (!host || !port || !user || !pass) {
			throw new Error('SMTP environment variables (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS) must be set');
		}

		transporter = createTransport({
			host,
			port: parseInt(port, 10),
			secure: false,
			auth: { user, pass },
		});
	}

	return transporter;
};

export interface EmailMessage {
	subject: string;
	html: string;
}

export const sendEmail = async (to: string, message: EmailMessage): Promise<void> => {
	const from = process.env.SMTP_FROM;

	if (!from) {
		throw new Error('SMTP_FROM environment variable is not set');
	}

	await getTransporter().sendMail({
		from,
		to,
		subject: message.subject,
		html: message.html,
	});
};
