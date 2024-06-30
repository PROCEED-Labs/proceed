import { z } from 'zod';

export const SystemAdminUpdateInputSchema = z.object({
  role: z.enum(['admin']),
});
export type SystemAdminUpdateInput = z.infer<typeof SystemAdminUpdateInputSchema>;

export const SystemAdminCreationInputSchema = SystemAdminUpdateInputSchema.extend({
  userId: z.string(),
});
export type SystemAdminCreationInput = z.infer<typeof SystemAdminCreationInputSchema>;

export const SystemAdminSchema = SystemAdminCreationInputSchema.extend({
  id: z.string(),
  createdOn: z.string().datetime(),
  lastEdited: z.string().datetime(),
});
export type SystemAdmin = z.infer<typeof SystemAdminSchema>;
