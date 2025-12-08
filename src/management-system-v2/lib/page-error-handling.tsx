import { Err, type Result } from 'neverthrow';
import { UserFacingError } from './server-error-handling/user-error';
import { UnauthorizedError } from './ability/abilityHelper';
import { Err } from './errors';

export function errorResponse<ErrorType extends UserFacingError | UnauthorizedError | unknown>(
  result: Err<never, ErrorType>,
) {}
