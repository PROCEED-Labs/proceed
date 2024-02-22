import { z } from 'zod';

export const FolderUserInputSchema = z.object({
  name: z.string(),
});
export type FolderUserInput = z.infer<typeof FolderUserInputSchema>;

export const FolderSchema = FolderUserInputSchema.extend({
  id: z.string().optional(),
  parentId: z.string(),
  createdBy: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  environmentId: z.string(),
});
export type Folder = z.infer<typeof FolderSchema> & { id: string };
