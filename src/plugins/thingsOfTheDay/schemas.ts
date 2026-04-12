import { z } from 'zod';
import { thingSchema } from '../../lib/schemas.js';

export const thingsOfTheDayResponse = z.array(
	thingSchema.extend({
		sections: z.array(z.object({
			id: z.string(),
			position: z.number(),
		})),
	}),
);

export type ThingsOfTheDay = z.infer<typeof thingsOfTheDayResponse>[number];
