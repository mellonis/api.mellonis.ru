import { z } from 'zod';

enum SectionType {
	Common = 1,
	Ring,
	CollectionOfPoems
}

enum SectionThingsOrder {
	Asc = 1,
	Original = 0,
	Desc = -1,
}

enum ThingCategory {
	Poetry = 1,
	Proze,
	Tlya,
	Though
}

export const sectionsResponse = z.array(
	z.object({
		id: z.string(),
		typeId: z.nativeEnum(SectionType),
		title: z.string(),
		description: z.optional(z.string()),
		settings: z.object({
			showAll: z.boolean(),
			thingsOrder: z.nativeEnum(SectionThingsOrder),
		}),
		thingsCount: z.number().int().min(0),
	}),
);

export const thingsRequest = z.object({
	id: z.string(),
});

export const thingsResponse = z.array(
	z.object({
		id: z.number(),
		position: z.number(),
		categoryId: z.nativeEnum(ThingCategory),
		title: z.optional(z.string()),
		firstLines: z.optional(z.array(z.string())),
		startDate: z.optional(z.string().date()),
		finishDate: z.string().date(),
		text: z.string(),
		notes: z.optional(z.array(z.string())),
	}),
);
