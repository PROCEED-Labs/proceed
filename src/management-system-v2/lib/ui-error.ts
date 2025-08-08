import { UserFacingError } from './user-error';

/**
 * If thrown in a server component, the message will be displayed to the user in the ui through the
 * error boundary.
 * If thrown in a server action, the error message will be sent back as a userError
 * (if the server action implements the right functions)
 */
export class UIError extends UserFacingError {
  static prefix = '500';
  constructor(message?: string) {
    super(`${UIError.prefix}: ${message || 'Something went wrong'}`);
    this.name = 'UserFacingError';
  }
}
