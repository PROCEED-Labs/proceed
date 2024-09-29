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

/**
 * Wraps a server call function to provide success and error handling with optional display mechanisms.
 * */
export async function wrapServerCall<Return>(args: {
  /** The server call */
  fn: () => Promise<Return>;
  /**
   * If the server call succeeds:
   *
   * - undefined: the wrapper displays a default success message
   * - false: display no message on success
   * - string: the wrapper displays the string as a success message
   * - function: the wrapper calls the function with the return of the server call
   * */
  onSuccess?: string | ((ret: Exclude<Return, ReturnType<typeof userError>>) => void) | false;
  /**
   * Choose which one of antDesign's data displays to use. This only does something,
   * when `onSuccess` is either undefined or a string
   * */
  successDisplay?: 'message' | 'notification';
  /**
   * If the server call fails or an error happens:
   *
   * - undefined: in the case that the server call returns a user error, the wrapper displays the
   * - false: display no message on error
   *   user error's message. If there is no error message or a error was thrown, the wrapper displays
   *   a default message
   * - string: the wrapper displays the string as an error message
   * - function: the wrapper calls the function with either a userError or an Error
   * */
  onError?: string | ((error: Error | UserError) => void) | false;
  /**
   * Choose which one of antDesign's data displays to use. This only does something,
   * when `onError` is either undefined or a string
   * */
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
