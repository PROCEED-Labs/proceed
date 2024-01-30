import z, { ZodRawShape } from 'zod';
import { ReactNode, useState } from 'react';

/**
 * This is just to avoid boilerplate when using the errors with an AntDesign Input
 * @example
 *
 *<Form.Item name="name" {...antDesignInputProps(formErrors, 'name')} required>
 *  <Input placeholder="Environment Name" />
 *</Form.Item>
 * */
export function antDesignInputProps<T extends Partial<Record<string, ReactNode>>>(
  errors: T,
  key: keyof T,
) {
  return {
    validateStatus: key in errors ? ('error' as const) : ('' as const),
    help: errors[key] ?? '',
    hasFeedback: true,
  };
}

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
    try {
      return schema.parse(input);
    } catch (e) {
      if (e instanceof z.ZodError) {
        parseErrors(e.issues);
      }
    }

    return null;
  }

  function resetErrors() {
    setErrors({});
  }

  return [errors, parseInput, resetErrors] as const;
}
