import type { FastifyInstance, FastifyRequest } from 'fastify';
import { errorResponse } from '../../lib/schemas.js';
import { authErrorResponse } from '../auth/schemas.js';
import { upsertVote, deleteVote, getVoteCounts } from './databaseHelpers.js';
import {
	voteParams,
	voteRequest,
	voteCountsResponse,
	type VoteParams,
	type VoteRequest,
} from './schemas.js';

export async function votesPlugin(fastify: FastifyInstance) {
	fastify.log.info('[PLUGIN] Registering: votes...');

	fastify.addHook('onRequest', fastify.verifyJwt);
	fastify.addHook('onRequest', fastify.requireRight('canVote'));

	fastify.put('/:thingId/vote', {
		schema: {
			description: 'Cast, update, or remove a vote for a thing. Vote 0 removes the vote.',
			tags: ['Votes'],
			params: voteParams,
			body: voteRequest,
			response: {
				200: voteCountsResponse,
				401: authErrorResponse,
				403: authErrorResponse,
				500: errorResponse,
			},
		},
		handler: async (request: FastifyRequest<{ Params: VoteParams; Body: VoteRequest }>, reply) => {
			try {
				const { thingId } = request.params;
				const { vote } = request.body;
				const userId = request.user!.sub;

				if (vote === 0) {
					await deleteVote(fastify.mysql, thingId, userId);
					request.log.info({ thingId, userId }, 'Vote removed');
				} else {
					await upsertVote(fastify.mysql, thingId, userId, vote);
					request.log.info({ thingId, userId, vote }, 'Vote recorded');
				}

				return await getVoteCounts(fastify.mysql, thingId);
			} catch (error) {
				request.log.error(error);
				return reply.code(500).send({ error: 'Internal server error' });
			}
		},
	});

	fastify.log.info('[PLUGIN] Registered: votes');
}
