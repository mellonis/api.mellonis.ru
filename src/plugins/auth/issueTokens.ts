import type { FastifyInstance } from 'fastify';
import type { AccessTokenPayload } from './jwt.js';
import { generateRefreshToken, hashRefreshToken, signAccessToken } from './jwt.js';
import { isBanned, resolveRights } from './rights.js';
import { createRefreshToken } from './databaseHelpers.js';

const GROUP_ADMINS = 1;
const GROUP_EDITORS = 2;

export const issueTokens = async (
	fastify: FastifyInstance,
	userId: number,
	login: string,
	userRights: number,
	groupRights: number,
	groupId: number,
	tokenVersion: number,
) => {
	const rights = resolveRights(userRights, groupRights);
	const banned = isBanned(userRights) || isBanned(groupRights);
	const isAdmin = !banned && groupId === GROUP_ADMINS;
	const isEditor = !banned && (groupId === GROUP_ADMINS || groupId === GROUP_EDITORS);
	const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

	const payload: AccessTokenPayload = { sub: userId, login, isAdmin, isEditor, tokenVersion, rights };
	const accessToken = await signAccessToken(payload, secret);
	const refreshToken = generateRefreshToken();

	await createRefreshToken(fastify.mysql, userId, hashRefreshToken(refreshToken));

	return { accessToken, refreshToken, user: { id: userId, login, isAdmin, isEditor, rights } };
};
