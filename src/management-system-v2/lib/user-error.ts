import { ReactNode } from 'react';

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
