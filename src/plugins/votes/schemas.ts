import { z } from 'zod';

export const voteParams = z.object({
	thingId: z.coerce.number().int().positive(),
});

export const voteRequest = z.object({
	vote: z.number().int().min(-1).max(1),
});

export const voteCountsResponse = z.object({
	plus: z.number().int().min(0),
	minus: z.number().int().min(0),
});

export type VoteParams = z.infer<typeof voteParams>;
export type VoteRequest = z.infer<typeof voteRequest>;
