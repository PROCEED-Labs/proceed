import { ReactNode, useState } from 'react';

export function useParseServerErrors<TObj extends Record<string, any>>(
  keys: Partial<{
    [K in keyof TObj]: string;
  }>,
) {
  type ErrorsObject = { [field in keyof TObj]?: ReactNode };
  const [errorsState, setErrorsState] = useState<ErrorsObject>({});

  function parseErrors(e: any) {
    if (!(typeof e === 'object' && e !== null && 'errors' in e)) {
      setErrorsState({});
      return;
    }

    const errorList: { [field in keyof TObj]?: ReactNode[] } = {};

    function appendError(key: keyof TObj, error: string) {
      const errorString = error.replace(key as string, keys[key] as string);
      if (key in errorList) {
        errorList[key]!.push(<li key={errorList[key]?.length}>{errorString}</li>);
      } else {
        errorList[key] = [<li key={0}>{errorString}</li>];
      }
    }

    for (const error of e.errors as string[]) {
      for (const key of Object.keys(keys)) {
        if (error.includes(key)) appendError(key, error);
      }
    }

    const errors: ErrorsObject = {};
    for (const [key, value] of Object.entries(errorList)) {
      errors[key as keyof TObj] = <ul>{value}</ul>;
    }

    setErrorsState(errors);
  }

  return [errorsState, parseErrors] as const;
}
