import { z } from 'zod';

export const searchQuery = z.object({
	q: z.string().min(1).max(200),
	limit: z.coerce.number().int().min(1).max(50).default(20),
	offset: z.coerce.number().int().min(0).default(0),
});

export type SearchQuery = z.infer<typeof searchQuery>;

export const searchHit = z.object({
	id: z.number().int(),
	title: z.string(),
	firstLine: z.string(),
	text: z.string(),
	notes: z.string(),
	audioTitles: z.string(),
	categoryId: z.number().int(),
});

export const searchResponse = z.object({
	hits: z.array(searchHit),
	totalHits: z.number().int(),
	query: z.string(),
});
