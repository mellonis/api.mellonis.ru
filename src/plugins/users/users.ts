import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { errorResponse } from '../../lib/schemas.js';
import { checkPassword, hashPassword } from '../auth/password.js';
import { deleteAllUserRefreshTokens } from '../auth/databaseHelpers.js';
import { getUserCredentials, updatePassword, deleteUser } from './databaseHelpers.js';
import { authErrorResponse } from '../auth/schemas.js';
import {
	userIdParam,
	changePasswordRequest,
	deleteUserRequest,
	type UserIdParam,
	type ChangePasswordRequest,
	type DeleteUserRequest,
} from './schemas.js';

export async function usersPlugin(fastify: FastifyInstance) {
	fastify.log.info('[PLUGIN] Registering: users...');

	fastify.addHook('onRequest', fastify.verifyJwt);

	fastify.patch('/:id/password', {
		schema: {
			description: 'Change the authenticated user\'s password. Revokes all sessions.',
			tags: ['Users'],
			params: userIdParam,
			body: changePasswordRequest,
			response: {
				200: z.object({ message: z.string() }),
				401: authErrorResponse,
				403: authErrorResponse,
				404: authErrorResponse,
				500: errorResponse,
			},
		},
		handler: async (request: FastifyRequest<{ Params: UserIdParam; Body: ChangePasswordRequest }>, reply) => {
			try {
				const { id } = request.params;
				const { currentPassword, newPassword } = request.body;
				const user = request.user!;

				const isSelf = user.sub === id;

				if (!isSelf) {
					return reply.code(403).send({ error: 'forbidden', message: 'Cannot change another user\'s password' });
				}

				const credentials = await getUserCredentials(fastify.mysql, id);

				if (!credentials) {
					return reply.code(404).send({ error: 'user_not_found', message: 'User not found' });
				}

				const passwordValid = await checkPassword(currentPassword, credentials.passwordHash);

				if (!passwordValid) {
					request.log.warn({ login: user.login, userId: id }, 'Password change failed: invalid current password');
					return reply.code(401).send({ error: 'invalid_credentials', message: 'Invalid credentials' });
				}

				const newHash = await hashPassword(newPassword);
				await updatePassword(fastify.mysql, id, newHash);
				await deleteAllUserRefreshTokens(fastify.mysql, id);
				await fastify.authNotifier.sendPasswordChanged(credentials.email, user.login, fastify.resolveOrigin(request));

				request.log.info({ login: user.login, userId: id }, 'Password changed');
				return { message: 'Password changed successfully' };
			} catch (error) {
				request.log.error(error);
				return reply.code(500).send({ error: 'Internal server error' });
			}
		},
	});

	fastify.delete('/:id', {
		schema: {
			description: 'Delete the authenticated user\'s account. Requires password confirmation.',
			tags: ['Users'],
			params: userIdParam,
			body: deleteUserRequest,
			response: {
				204: z.void(),
				401: authErrorResponse,
				403: authErrorResponse,
				404: authErrorResponse,
				500: errorResponse,
			},
		},
		handler: async (request: FastifyRequest<{ Params: UserIdParam; Body: DeleteUserRequest }>, reply) => {
			try {
				const { id } = request.params;
				const { password } = request.body;
				const user = request.user!;

				const isSelf = user.sub === id;

				if (!isSelf) {
					return reply.code(403).send({ error: 'forbidden', message: 'Cannot delete another user\'s account' });
				}

				const credentials = await getUserCredentials(fastify.mysql, id);

				if (!credentials) {
					return reply.code(404).send({ error: 'user_not_found', message: 'User not found' });
				}

				const passwordValid = await checkPassword(password, credentials.passwordHash);

				if (!passwordValid) {
					request.log.warn({ login: user.login, userId: id }, 'Account deletion failed: invalid password');
					return reply.code(401).send({ error: 'invalid_credentials', message: 'Invalid credentials' });
				}

				await deleteAllUserRefreshTokens(fastify.mysql, id);
				await deleteUser(fastify.mysql, id);

				request.log.info({ login: user.login, userId: id }, 'Account deleted');
				return reply.code(204).send();
			} catch (error) {
				request.log.error(error);
				return reply.code(500).send({ error: 'Internal server error' });
			}
		},
	});

	fastify.log.info('[PLUGIN] Registered: users');
}
