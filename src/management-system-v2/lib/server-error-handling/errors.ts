import { UserFacingError } from './user-error';

export class NotFoundError extends UserFacingError {
  constructor(message?: string) {
    super(`${message || 'Not found'}`);
  }
}
export class SpaceNotFoundError extends UserFacingError {
  constructor(message?: string) {
    super(`${message || 'Space not found'}`);
  }
}
