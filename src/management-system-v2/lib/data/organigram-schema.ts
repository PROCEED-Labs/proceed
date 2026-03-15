import { z } from 'zod';

export const OrganigramInputSchema = z.object({
  userId: z.string(),
  environmentId: z.string(),
  directManagerId: z.string().optional().nullable(),
  teamRoleId: z.string().optional().nullable(),
  backOfficeRoleId: z.string().optional().nullable(),
});

export type OrganigramInput = z.infer<typeof OrganigramInputSchema>;

export type Organigram = OrganigramInput & {
  id: string;
};
