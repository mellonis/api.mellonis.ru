import { z } from 'zod';
import { loginResponse, authErrorResponse } from '../schemas.js';

export const passkeyRegisterVerifyRequest = z.object({
	name: z.string().min(1).max(100).default('Passkey'),
	credential: z.record(z.string(), z.unknown()),
});

export const passkeyLoginOptionsRequest = z.object({
	login: z.string().optional(),
});

export const passkeyLoginRequest = z.object({
	challengeId: z.string(),
	credential: z.record(z.string(), z.unknown()),
});

export const passkeyRegisterOptionsResponse = z.object({
	options: z.record(z.string(), z.unknown()),
});

export const passkeyLoginOptionsResponse = z.object({
	challengeId: z.string(),
	options: z.record(z.string(), z.unknown()),
});

export const passkeyListItem = z.object({
	id: z.number(),
	name: z.string(),
	createdAt: z.string(),
	lastUsedAt: z.string().nullable(),
});

export const passkeyListResponse = z.array(passkeyListItem);

export { loginResponse as passkeyLoginResponse, authErrorResponse };

export type PasskeyRegisterVerifyRequest = z.infer<typeof passkeyRegisterVerifyRequest>;
export type PasskeyLoginOptionsRequest = z.infer<typeof passkeyLoginOptionsRequest>;
export type PasskeyLoginRequest = z.infer<typeof passkeyLoginRequest>;
