import { z } from 'zod';

export const VersionedObjectInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  folderId: z.string().optional(),
});

export type VersionedObjectInput = z.infer<typeof VersionedObjectInputSchema>;

import { Prettify, WithRequired } from '../typescript-utils';

export const VersionedObjectInput = VersionedObjectInputSchema.extend({
  environmentId: z.string(),
  ownerId: z.string(),
});
export type VersionedObjectServerInput = z.infer<typeof VersionedObjectInput>;

export type VersionedObjectMetadata<T> = Prettify<
  WithRequired<VersionedObjectServerInput, 'id' | 'name' | 'folderId'> & {
    type: T;
    variables: {
      name: string;
      type: string;
      value: string;
    }[];
    departments: string[];
    inEditingBy?: {
      id: string;
      task?: string;
    }[];
    createdOn: Date;
    lastEditedOn: Date;
    sharedAs: 'public' | 'protected';
    shareTimestamp: number;
    allowIframeTimestamp: number;
    versions: {
      version: number;
      name: string;
      description: string;
      versionBasedOn?: number;
    }[];
  }
>;

export type VersionedObject<T> = Prettify<VersionedObjectMetadata<T>>;
