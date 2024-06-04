import { z } from 'zod';
import { Prettify } from '../typescript-utils';

export const FolderUserInputSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  parentId: z.string().nullable(),
  environmentId: z.string(),
});
export type FolderUserInput = z.infer<typeof FolderUserInputSchema>;

export const FolderSchema = FolderUserInputSchema.extend({
  id: z.string().optional(),
  createdBy: z.string(),
});
export type FolderInput = z.infer<typeof FolderSchema>;

export type Folder = Prettify<
  z.infer<typeof FolderSchema> & {
    id: string;
    createdOn: string;
    lastEdited: string;
  }
>;
