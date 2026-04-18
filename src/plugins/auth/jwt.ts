import { randomBytes, createHash } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import type { ResolvedRights } from './rights.js';

export interface AccessTokenPayload {
	sub: number;
	login: string;
	tokenVersion: number;
	rights: ResolvedRights;
}

const REFRESH_TOKEN_BYTES = 32;

// JWT_ACCESS_TOKEN_TTL is validated at startup in auth.ts.
const getAccessTokenTtl = (): string => `${process.env.JWT_ACCESS_TOKEN_TTL!}s`;

export const signAccessToken = async (payload: AccessTokenPayload, secret: Uint8Array): Promise<string> =>
	new SignJWT({
		login: payload.login,
		tokenVersion: payload.tokenVersion,
		rights: payload.rights,
	})
		.setProtectedHeader({ alg: 'HS256' })
		.setSubject(String(payload.sub))
		.setIssuedAt()
		.setExpirationTime(getAccessTokenTtl())
		.sign(secret);

export const verifyAccessToken = async (token: string, secret: Uint8Array): Promise<AccessTokenPayload> => {
	const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });

	return {
		sub: Number(payload.sub),
		login: payload.login as string,
		tokenVersion: payload.tokenVersion as number,
		rights: payload.rights as ResolvedRights,
	};
};

export const generateRefreshToken = (): string =>
	randomBytes(REFRESH_TOKEN_BYTES).toString('hex');

export const hashRefreshToken = (token: string): string =>
	createHash('sha256').update(token).digest('hex');
