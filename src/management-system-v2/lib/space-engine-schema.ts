import { z } from 'zod';

export const SpaceEngineInputSchema = z.object({
  address: z.string().url(),
  name: z.string().nullish(),
});
export type SpaceEngineInput = z.infer<typeof SpaceEngineInputSchema>;
