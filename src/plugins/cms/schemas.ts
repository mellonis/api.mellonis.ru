import { z } from 'zod';

// --- Section types reference ---

export const sectionTypeItem = z.object({
	id: z.number().int(),
	title: z.string(),
});

export const sectionTypesResponse = z.array(sectionTypeItem);

// --- CMS section settings ---

export const cmsSectionSettings = z.object({
	showAll: z.boolean(),
	reverseOrder: z.boolean(),
});

// --- CMS section ---

export const cmsSectionItem = z.object({
	id: z.number().int(),
	identifier: z.string(),
	title: z.string(),
	description: z.string().nullable(),
	annotationText: z.string().nullable(),
	annotationAuthor: z.string().nullable(),
	typeId: z.number().int(),
	statusId: z.number().int(),
	redirectSectionId: z.number().int().nullable(),
	settings: cmsSectionSettings.nullable(),
	order: z.number().int(),
});

export const cmsSectionsResponse = z.array(cmsSectionItem);

// --- Section params ---

export const sectionIdParam = z.object({
	id: z.coerce.number().int().positive(),
});

// --- Create section ---

export const createSectionRequest = z.object({
	identifier: z.string().regex(/^[a-z][a-z0-9]{1,6}$/),
	title: z.string().min(1).max(45),
	description: z.string().nullable().default(null),
	annotationText: z.string().nullable().default(null),
	annotationAuthor: z.string().max(100).nullable().default(null),
	typeId: z.number().int().min(1).max(3),
	statusId: z.number().int().min(1).max(4).optional(),
	redirectSectionId: z.number().int().nullable().default(null),
	settings: cmsSectionSettings.nullable().default(null),
	order: z.number().int().positive().optional(),
});

// --- Update section ---

export const updateSectionRequest = z.object({
	title: z.string().min(1).max(45).optional(),
	description: z.string().nullable().optional(),
	annotationText: z.string().nullable().optional(),
	annotationAuthor: z.string().max(100).nullable().optional(),
	typeId: z.number().int().min(1).max(3).optional(),
	statusId: z.number().int().min(1).max(4).optional(),
	redirectSectionId: z.number().int().nullable().optional(),
	settings: cmsSectionSettings.nullable().optional(),
	order: z.number().int().positive().optional(),
});

// --- Reorder sections ---

export const reorderSectionsRequest = z.array(z.number().int().positive());

// --- Things in section ---

export const cmsThingItem = z.object({
	thingId: z.number().int(),
	title: z.string().nullable(),
	firstLines: z.array(z.string()).nullable(),
});

export const cmsThingsResponse = z.array(cmsThingItem);

export const cmsSectionThingItem = cmsThingItem.extend({
	position: z.number().int(),
});

export const cmsSectionThingsResponse = z.array(cmsSectionThingItem);

export const thingInSectionParams = z.object({
	id: z.coerce.number().int().positive(),
	thingId: z.coerce.number().int().positive(),
});

// --- Add thing to section ---

export const addThingRequest = z.object({
	thingId: z.number().int().positive(),
	position: z.number().int().positive().optional(),
});

// --- Reorder things in section ---

export const reorderThingsRequest = z.array(z.number().int().positive());

// --- Author ---

export const cmsAuthorResponse = z.object({
	text: z.string(),
	date: z.string(),
	seoDescription: z.optional(z.string()),
	seoKeywords: z.optional(z.string()),
});

export const updateAuthorRequest = z.object({
	text: z.string().min(1),
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	seoDescription: z.string().nullable().default(null),
	seoKeywords: z.string().nullable().default(null),
});

// --- Inferred types ---

export type SectionIdParam = z.infer<typeof sectionIdParam>;
export type CreateSectionRequest = z.infer<typeof createSectionRequest>;
export type UpdateSectionRequest = z.infer<typeof updateSectionRequest>;
export type ReorderSectionsRequest = z.infer<typeof reorderSectionsRequest>;
export type ThingInSectionParams = z.infer<typeof thingInSectionParams>;
export type AddThingRequest = z.infer<typeof addThingRequest>;
export type ReorderThingsRequest = z.infer<typeof reorderThingsRequest>;
export type UpdateAuthorRequest = z.infer<typeof updateAuthorRequest>;
