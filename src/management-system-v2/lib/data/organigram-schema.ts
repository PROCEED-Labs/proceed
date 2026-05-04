import { z } from 'zod';

export const OrganigramInputSchema = z.object({
  memberId: z.string(),
  directManagerId: z.string().nullish(),
  teamRoleId: z.string().nullish(),
  backOfficeRoleId: z.string().nullish(),
});

export type OrganigramInput = z.infer<typeof OrganigramInputSchema>;

export type Organigram = OrganigramInput & {
  id: string;
};
