import { z } from 'zod';

export const SpaceEngineInputSchema = z.object({
  address: z.string(),
});
export type SpaceEngineInput = z.infer<typeof SpaceEngineInputSchema>;
