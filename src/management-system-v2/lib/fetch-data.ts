import { authFetchJSON, useAuthStore } from './iam';
import { UseQueryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import createClient from 'openapi-fetch';
import { paths } from './openapiSchema';
import { useMemo } from 'react';

const BASE_URL = process.env.API_URL;

const apiClient = createClient<paths>({ baseUrl: BASE_URL });

type Prettify<T> = T extends (infer L)[] ? Prettify<L>[] : { [K in keyof T]: T[K] } & {};
type QueryData<T extends (...args: any) => any> = Prettify<
  Extract<Awaited<ReturnType<T>>, { data: any }>['data']
>;

type ObjectToUnion<TObj extends Record<any, any>> = TObj[keyof TObj];
export type ApiRequestBody<
  KPath extends keyof paths,
  KMethod extends keyof paths[KPath],
> = paths[KPath][KMethod] extends { requestBody?: any }
  ? Exclude<paths[KPath][KMethod]['requestBody'], undefined> extends { content: any }
    ? Prettify<ObjectToUnion<Exclude<paths[KPath][KMethod]['requestBody'], undefined>['content']>>
    : unknown
  : unknown;

export type ApiData<
  KPath extends keyof paths,
  KMethod extends keyof paths[KPath],
> = paths[KPath][KMethod] extends { responses: any }
  ? paths[KPath][KMethod]['responses'] extends { '200': any }
    ? paths[KPath][KMethod]['responses']['200'] extends { content: any }
      ? Prettify<ObjectToUnion<paths[KPath][KMethod]['responses']['200']['content']>>
      : unknown
    : unknown
  : unknown;

export function useGetAsset<
  TFirstParam extends Parameters<typeof apiClient.get>[0],
  TSecondParam extends Parameters<typeof apiClient.get<TFirstParam>>[1],
>(
  path: TFirstParam,
  params: TSecondParam['params'],
  reactQueryOptions?: Omit<UseQueryOptions, 'queryFn'>,
) {
  const keys = useMemo(() => {
    const keys = [path];
    if (params && (params as any).path) {
      keys.push((params as any).path);
    }

    return keys;
  }, [path, params]);

  type Data = QueryData<typeof apiClient.get<TFirstParam>> | null;

  return useQuery({
    // eslint-disable-next-line
    queryKey: keys,
    queryFn: async () => {
      const state = useAuthStore.getState();

      if (process.env.NEXT_PUBLIC_USE_AUTH && !state.loggedIn) throw new Error('Not logged in');

      // @ts-ignore
      const { data, error, response } = await apiClient.get(path, {
        headers: process.env.NEXT_PUBLIC_USE_AUTH
          ? {
              'x-csrf-token': state.csrfToken,
              'x-csrf': '1',
            }
          : undefined,
        credentials: process.env.NEXT_PUBLIC_USE_AUTH
          ? process.env.NODE_ENV === 'production'
            ? 'same-origin'
            : 'include'
          : undefined,
        params,
      } as TSecondParam);

      if (error || data === undefined) throw new Error(`Error fetching: ${response.statusText}`);

      if (response.status === 204) return null;

      // in case of 'no content' just return undefined if (response.status === 204) return null;
      return data as Data;
    },
    ...(reactQueryOptions as UseQueryOptions<Data, Error>),
  });
}

export function usePostAsset<TFirstParam extends Parameters<typeof apiClient.post>[0]>(
  path: TFirstParam,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: Parameters<typeof apiClient.post<TFirstParam>>[1]) => {
      const state = useAuthStore.getState();

      if (process.env.NEXT_PUBLIC_USE_AUTH && !state.loggedIn) throw new Error('Not logged in');

      const { response, data, error } = await apiClient.post(path, {
        headers: process.env.NEXT_PUBLIC_USE_AUTH
          ? {
              'x-csrf-token': state.csrfToken,
              'x-csrf': '1',
            }
          : undefined,
        credentials: process.env.NODE_ENV === 'production' ? 'same-origin' : 'include',
        ...body,
      });

      if (error) throw new Error(`Error calling POST:${path} -> ${response.body}`);

      queryClient.invalidateQueries([path, (body as any).params.path]);

      return data as QueryData<typeof apiClient.post<TFirstParam>>;
    },
  });
}

export function usePutAsset<TFirstParam extends Parameters<typeof apiClient.put>[0]>(
  path: TFirstParam,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: Parameters<typeof apiClient.put<TFirstParam>>[1]) => {
      const state = useAuthStore.getState();

      if (process.env.NEXT_PUBLIC_USE_AUTH && !state.loggedIn) throw new Error('Not logged in');

      const { response, data, error } = await apiClient.put(path, {
        headers: process.env.NEXT_PUBLIC_USE_AUTH
          ? {
              'x-csrf-token': state.csrfToken,
              'x-csrf': '1',
            }
          : undefined,
        credentials: process.env.NODE_ENV === 'production' ? 'same-origin' : 'include',
        ...body,
      });

      if (error) throw error;

      queryClient.invalidateQueries([path, (body as any).params.path]);

      return data as QueryData<typeof apiClient.put<TFirstParam>>;
    },
  });
}

export const useDeleteAsset = <TFirstParam extends Parameters<typeof apiClient.del>[0]>(
  path: TFirstParam,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: Parameters<typeof apiClient.del<TFirstParam>>[1]) => {
      const state = useAuthStore.getState();

      if (process.env.NEXT_PUBLIC_USE_AUTH && !state.loggedIn) throw new Error('Not logged in');

      const { response, data, error } = await apiClient.del(path, {
        headers: process.env.NEXT_PUBLIC_USE_AUTH
          ? {
              'x-csrf-token': state.csrfToken,
              'x-csrf': '1',
            }
          : undefined,
        credentials: process.env.NODE_ENV === 'production' ? 'same-origin' : 'include',
        ...body,
      });

      if (error) throw new Error(`Error calling POST:${path} -> ${response.body}`);

      queryClient.invalidateQueries([path, (body as any).params.path]);

      return data as QueryData<typeof apiClient.del<TFirstParam>>;
    },
  });
};

const UnauthenticatedfetchJSON = async <T>(
  url: string,
  options: Parameters<typeof fetch>[1] = undefined,
) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json() as Promise<T>;
};

const fetchString = async (url: string, options = {}) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }

  return response.text();
};

const fetchJSON = process.env.NEXT_PUBLIC_USE_AUTH ? authFetchJSON : UnauthenticatedfetchJSON;

// We use distinct types for the
// if(data){
//   data[0].
// }collection and individual resource responses
// instead of `Item[]` because they might differ in what data they contain.

export const fetchProcesses = async () => {
  const url = `${BASE_URL}/process?noBpmn=true`;
  const data = await fetchJSON<Processes>(url);

  return data.map((process) => ({
    ...process,
    // Convert JSON dates to Date objects.
    createdOn: new Date(process.createdOn),
    lastEdited: new Date(process.lastEdited),
  }));
};

export const fetchProcess = async (definitionId: string) => {
  const url = `${BASE_URL}/process/${definitionId}`;
  return await fetchJSON<Process>(url);
};

export const fetchUserTaskFileNames = async (definitionId: string) => {
  const url = `${BASE_URL}/process/${definitionId}/user-tasks/`;
  return await fetchJSON<string[]>(url);
};

export const fetchUserTaskHTML = async (definitionId: string, fileName: string) => {
  const url = `${BASE_URL}/process/${definitionId}/user-tasks/${fileName}`;
  return await fetchString(url);
};

export const fetchProcessVersion = async (definitionId: string, version: number) => {
  const url = `${BASE_URL}/process/${definitionId}/versions/${version}`;
  return await fetchString(url);
};

export const fetchProcessVersionBpmn = async (definitionId: string, version: number | string) => {
  const url = `${BASE_URL}/process/${definitionId}/versions/${version}`;
  return await fetchString(url);
};

/**
 * IMPORTANT
 *
 * The following types are only temporary until we have converted the API to the
 * new NextJS framework. These types should ideally be automatically generated
 * from the database schema (e.g. using Prisma).
 */

export type User = {
  // id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  picture: string;
};

export type Process = {
  type: 'process';
  description: string;
  owner: string | null;
  processIds: string[];
  variables: [];
  departments: [];
  inEditingBy: [];
  createdOn: Date;
  lastEdited: Date;
  shared: boolean;
  versions: { version: number | string; name: string; description: string }[];
  definitionId: string;
  definitionName: string;
  bpmn?: string;
};

export type Processes = Process[];
