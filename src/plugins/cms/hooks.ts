import type { FastifyReply, FastifyRequest } from 'fastify';

export const requireCanEditContent = async (request: FastifyRequest, reply: FastifyReply) => {
	if (!request.user?.rights.canEditContent) {
		return reply.code(403).send({ error: 'forbidden', message: 'Missing required right: canEditContent' });
	}
};

export const requireAdmin = async (request: FastifyRequest, reply: FastifyReply) => {
	if (!request.user?.isAdmin) {
		return reply.code(403).send({ error: 'forbidden', message: 'Admin access required' });
	}
};

export const requireCanEditUsers = async (request: FastifyRequest, reply: FastifyReply) => {
	if (!request.user?.rights.canEditUsers) {
		return reply.code(403).send({ error: 'forbidden', message: 'Missing required right: canEditUsers' });
	}
};
