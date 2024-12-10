import { z } from 'zod';

export const SpaceEngineInputSchema = z.object({
  address: z.string(),
  name: z.string().nullish(),
});
export type SpaceEngineInput = z.infer<typeof SpaceEngineInputSchema>;
