import { Err } from 'neverthrow';
import { UserFacingError } from './user-error';
import Content from '@/components/content';
import { NotFoundError, SpaceNotFoundError } from '@/lib/server-error-handling/errors';
import { Result, ResultProps } from 'antd';
import { UnauthorizedError } from '../ability/abilityHelper';
import RetryButton from './retry-button';

export function errorResponse<ErrorType extends UserFacingError | UnauthorizedError | unknown>(
  result: Err<never, ErrorType> | unknown,
) {
  const error = result instanceof Err ? result.error : undefined;

  let title = 'Something Went wrong';
  let status: ResultProps['status'] = 'warning';

  if (error instanceof UserFacingError) {
    title = error.message;
    if (error instanceof NotFoundError || error instanceof SpaceNotFoundError) {
      status = '404';
    }
  } else if (error instanceof UnauthorizedError) {
    title = 'Not allowed';
    status = '403';
  }

  return (
    <Content>
      <Result title={title} status={status} extra={<RetryButton />} />
    </Content>
  );
}
