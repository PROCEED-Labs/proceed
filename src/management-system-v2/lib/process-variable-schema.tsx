import { z } from 'zod';

export const allowedTypes = ['string', 'number', 'boolean', 'object', 'array'] as const;
type AllowedType = (typeof allowedTypes)[number];

// maps from the data types to what we want to display to the user
export const typeLabelMap: Record<AllowedType, string> = {
  string: 'Text',
  number: 'Number',
  boolean: 'On/Off - True/False',
  object: 'Combined Structure',
  array: 'List',
} as const;

const allowedFormats = ['email', 'url'] as const;
type AllowedFormat = (typeof allowedFormats)[number];
export const textFormatMap: Record<AllowedFormat, string> = {
  email: 'E-Mail',
  url: 'URL',
} as const;

export const ProcessVariableSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  dataType: z.enum(allowedTypes),
  textFormat: z.enum(allowedFormats).optional(),
  defaultValue: z.string().optional(),
  requiredAtInstanceStartup: z.boolean().optional(),
  enum: z.string().optional(),
  const: z.boolean().optional(),
});

export type ProcessVariable = z.infer<typeof ProcessVariableSchema>;
