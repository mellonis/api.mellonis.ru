import { z } from 'zod';

// --- Groups reference ---

export const cmsGroupItem = z.object({
	id: z.number().int(),
	title: z.string(),
	rights: z.number().int(),
});

export const cmsGroupsResponse = z.array(cmsGroupItem);

// --- User item ---

export const cmsUserItem = z.object({
	id: z.number().int(),
	login: z.string().nullable(),
	email: z.string().nullable(),
	groupId: z.number().int(),
	groupTitle: z.string(),
	rights: z.number().int(),
	lastLogin: z.string().nullable(),
	isBanned: z.boolean(),
	isEmailActivated: z.boolean(),
	isPasswordResetRequested: z.boolean(),
});

export const cmsUserResponse = cmsUserItem;
export const cmsUsersResponse = z.array(cmsUserItem);

// --- Params ---

export const userIdParam = z.object({
	userId: z.coerce.number().int().positive(),
});

// --- Create user ---

export const createUserRequest = z.object({
	login: z.string().regex(/^[a-z][a-z0-9_]{1,15}$/),
	email: z.string().email().max(50),
	password: z.string().min(6),
	groupId: z.number().int().min(0).max(3),
});

// --- Update user ---

export const updateUserRequest = z.object({
	groupId: z.number().int().min(0).max(3).optional(),
	rights: z.number().int().min(0).optional(),
});

// --- Inferred types ---

export type UserIdParam = z.infer<typeof userIdParam>;
export type CreateUserRequest = z.infer<typeof createUserRequest>;
export type UpdateUserRequest = z.infer<typeof updateUserRequest>;
