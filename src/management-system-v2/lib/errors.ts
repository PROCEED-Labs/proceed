import { UserFacingError } from './user-error';

export class SpaceNotFoundError extends UserFacingError {
  static prefix = '404' as const;
  constructor(message?: string) {
    super(`${SpaceNotFoundError.prefix}: ${message || 'Space not found'}`);
  }
}
