import { z } from 'zod';

export const authorResponse = z.object({
	text: z.string(),
	date: z.string(),
});

export type Author = z.infer<typeof authorResponse>;
