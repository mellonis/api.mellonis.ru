import { z } from 'zod';

export const authorResponse = z.object({
	text: z.string(),
});

export type Author = z.infer<typeof authorResponse>;
