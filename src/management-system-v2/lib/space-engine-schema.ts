import { z } from 'zod';

export const EngineConnectionInputSchema = z.object({
  address: z.string().url(),
  name: z.string().nullish(),
});
export type EngineConnectionInput = z.infer<typeof EngineConnectionInputSchema>;
