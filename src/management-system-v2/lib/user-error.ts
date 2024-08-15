import { ReactNode } from 'react';
import { notification, message } from '@/components/app';

export enum UserErrorType {
  /** ID already exists, illegal input, malformed input, etc. (default) */
  ConstraintError = 'ConstraintError',
  /** User lacks permission to perform this action. */
  PermissionError = 'PermissionError',
  /** User is not logged in. */
  NotLoggedInError = 'NotLoggedInError',
  /** Resource could not be found. */
  NotFoundError = 'NotFoundError',
  /** Resource is locked. */
  LockedResourceError = 'LockedResourceError',
}

/**
 * These are errors that are caused directly by the user's actions and can
 * potentially be fixed by the user. The message is displayed to the user and
 * should be as helpful as possible.
 */
export interface UserError {
  message: ReactNode;
  type: UserErrorType;
}

/**
 * Creates a new user error inside an object for server responses.
 *
 * @param message The error message to display to the user.
 * @param type The error type.
 */
export const userError = (
  message: ReactNode,
  type: UserErrorType = UserErrorType.ConstraintError,
) => {
  return { error: { message, type } as UserError };
};

export function isUserError(value: any): value is UserError {
  return (
    value &&
    typeof value === 'object' &&
    'message' in value &&
    'type' in value &&
    typeof value.type === 'string'
  );
}

export function isUserErrorResponse(value: any): value is { error: UserError } {
  return value && typeof value === 'object' && 'error' in value && isUserError(value.error);
}

export async function wrapServerCall<Return>(args: {
  fn: () => Promise<Return>;
  onSuccess?: string | ((ret: Exclude<Return, ReturnType<typeof userError>>) => void) | false;
  successDisplay?: 'message' | 'notification';
  onError?: string | ((error: Error | UserError) => void) | false;
  errorDisplay?: 'message' | 'notification';
}) {
  try {
    const response = await args.fn();

    if (isUserErrorResponse(response)) {
      throw response.error;
    }

    if (typeof args.onSuccess === 'function') {
      args.onSuccess(response as Exclude<Return, ReturnType<typeof userError>>);
      return;
    }

    if (args.onSuccess === false) return;

    const content = args.onSuccess ?? 'Success';
    if (args?.successDisplay === 'notification') notification.success({ message: content });
    else message.success(content);
  } catch (error) {
    if (typeof args.onError === 'function') {
      args.onError(error as UserError | Error);
      return;
    }

    if (args.onError === false) return;

    let content: ReactNode = args.onError ?? 'Something went wrong';
    if (isUserError(error)) content = error.message;

    if (args?.errorDisplay === 'notification') notification.error({ message: content });
    else message.error(content);
  }
}
