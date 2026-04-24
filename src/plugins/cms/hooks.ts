import type { FastifyReply, FastifyRequest } from 'fastify';

export const requireCanEditContent = async (request: FastifyRequest, reply: FastifyReply) => {
	if (!request.user?.rights.canEditContent) {
		return reply.code(403).send({ error: 'forbidden', message: 'Missing required right: canEditContent' });
	}
};
