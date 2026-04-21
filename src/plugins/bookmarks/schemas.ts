import { z } from 'zod';

export const bookmarkItem = z.object({
	sectionId: z.string(),
	positionInSection: z.coerce.number().int().nonnegative(),
});

export const bookmarkResponseItem = z.object({
	sectionId: z.string(),
	positionInSection: z.number().int(),
	title: z.string().nullable(),
	firstLines: z.array(z.string()).nullable(),
});

export const bookmarkResponse = z.array(bookmarkResponseItem);

export const addBookmarkRequest = bookmarkItem;

export const removeBookmarkRequest = bookmarkItem;

export const reorderRequest = z.object({
	bookmarks: z.array(bookmarkItem),
});

export const bulkAddRequest = z.object({
	bookmarks: z.array(bookmarkItem),
});

export type BookmarkItem = z.infer<typeof bookmarkItem>;
export type ReorderRequest = z.infer<typeof reorderRequest>;
export type BulkAddRequest = z.infer<typeof bulkAddRequest>;
