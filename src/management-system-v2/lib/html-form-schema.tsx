import { z } from 'zod';
import { ProcessVariableSchema } from './process-variable-schema';

export const HtmlFormMetaDataSchema = z.object({
  id: z.string(),
  userDefinedId: z.string().nullable(),
  name: z.string(),
  description: z.string(),
  createdOn: z.date(),
  lastEditedOn: z.date(),
  environmentId: z.string(),
  milestones: z
    .object({
      id: z.string(),
      name: z.string(),
      description: z.string().optional(),
    })
    .array(),
  variables: ProcessVariableSchema.array(),
  creatorId: z.string(),
});

export type HtmlFormMetaData = z.infer<typeof HtmlFormMetaDataSchema>;

export const HtmlFormSchema = HtmlFormMetaDataSchema.extend({
  html: z.string(),
  json: z.string(),
});

export type HtmlForm = z.infer<typeof HtmlFormSchema>;
