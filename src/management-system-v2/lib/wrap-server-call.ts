import { notification, message } from 'antd';
import { ReactNode } from 'react';
import { userError, UserError, isUserErrorResponse, isUserError } from './user-error';

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
