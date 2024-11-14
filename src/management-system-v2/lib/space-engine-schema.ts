import { z } from 'zod';

export const SpaceEngineInputSchema = z.object({
  url: z.string(),
});
export type SpaceEngineInput = z.infer<typeof SpaceEngineInputSchema>;
