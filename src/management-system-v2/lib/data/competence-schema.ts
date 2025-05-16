import { z } from 'zod';

export const CompetenceAttributeInputSchema = z.object({
  type: z.enum(['PLAIN_TEXT', 'SHORT_TEXT']),
  text: z.string(),
});

export type CompetenceAttributeInput = z.infer<typeof CompetenceAttributeInputSchema>;

export const CompetenceInputSchema = z.array(CompetenceAttributeInputSchema);

export type CompetenceInput = z.infer<typeof CompetenceInputSchema>;

export const CompetenceAttributeTypes = { plain: 'PLAIN_TEXT', short: 'SHORT_TEXT' } as const;

export type Competence = {
  id: string;
  userId: string | null;
  ownerType: 'USER' | 'SPACE';
  spaceId: string | null;
};
