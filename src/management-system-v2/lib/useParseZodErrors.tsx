import z, { ZodRawShape } from 'zod';
import { ReactNode, useState } from 'react';

export default function useParseZodErrors<T extends ZodRawShape>(schema: z.ZodObject<T>) {
  type Schema = z.infer<typeof schema>;
  type ErrorsObject = Partial<Record<keyof Schema, ReactNode>>;

  const [errors, setErrors] = useState<ErrorsObject>({});

  function parseErrors(errorList: z.ZodIssue[]) {
    const errors: ErrorsObject = {};

    for (const error of errorList) {
      errors[error.path[0] as keyof Schema] = error.message;
    }

    setErrors(errors);
  }

  function parseInput(input: unknown) {
    if (!input) {
      setErrors({});
      return null;
    }

    try {
      return schema.parse(input);
    } catch (e) {
      if (e instanceof z.ZodError) {
        return parseErrors(e.issues);
      }
    }
  }

  function resetErrors() {
    setErrors({});
  }

  return [errors, parseInput, resetErrors] as const;
}
