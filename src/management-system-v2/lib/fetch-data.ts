import { useAuthStore } from './iam';
import {
  UseMutationOptions,
  UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import createClient from 'openapi-fetch';
import { paths } from './openapiSchema';
import { useMemo } from 'react';

const BASE_URL = process.env.API_URL;

const apiClient = createClient<paths>({ baseUrl: BASE_URL });

function addAuthHeaders<TApiCall extends (typeof apiClient)[keyof typeof apiClient]>(
  call: TApiCall,
) {
  // @ts-ignore
  const wrappedFunction: typeof call = async (...args) => {
    const state = useAuthStore.getState();

    if (process.env.NEXT_PUBLIC_USE_AUTH && !state.loggedIn) throw new Error('Not logged in');

    // @ts-ignore
    const response = await (call as (...args: any[]) => Promise<any>)(args[0], {
      headers: {
        'x-csrf-token': process.env.NEXT_PUBLIC_USE_AUTH ? state.csrfToken : undefined,
        'x-csrf': '1',
      },
      credentials: process.env.NEXT_PUBLIC_USE_AUTH
        ? process.env.NODE_ENV === 'production'
          ? 'same-origin'
          : 'include'
        : undefined,
      ...args[1],
    });

    if (response.error) throw response.error;

    if (response.data === undefined)
      throw new Error(`Error fetching: ${response.response.statusText}`);

    return response;
  };

  return wrappedFunction as TApiCall;
}

export const get = addAuthHeaders(apiClient.get);
export const post = addAuthHeaders(apiClient.post);
export const put = addAuthHeaders(apiClient.put);
export const del = addAuthHeaders(apiClient.del);

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
>(path: TFirstParam, params: TSecondParam, reactQueryOptions?: Omit<UseQueryOptions, 'queryFn'>) {
  const keys = useMemo(() => {
    const keys = [path];
    if (
      typeof params === 'object' &&
      'params' in params &&
      typeof params.params === 'object' &&
      'path' in params.params
    ) {
      keys.push(params.params.path as any);
    }

    return keys;
  }, [path, params]);

  type Data = QueryData<typeof apiClient.get<TFirstParam>> | null;

  return useQuery({
    // eslint-disable-next-line
    queryKey: keys,
    queryFn: async () => {
      const { data } = await get(path, params);
      return data as Data;
    },
    ...(reactQueryOptions as UseQueryOptions<Data, Error>),
  });
}

export function usePostAsset<TFirstParam extends Parameters<typeof apiClient.post>[0]>(
  path: TFirstParam,
  mutationParams: Omit<UseMutationOptions, 'mutationFn'> = {},
) {
  type FunctionType = typeof apiClient.post<TFirstParam>;
  type Data = QueryData<FunctionType>;

  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: Parameters<FunctionType>[1]) => {
      const { data } = await post(path, body);

      const keys: any[] = [path];
      if (
        typeof body === 'object' &&
        'params' in body &&
        typeof body.params === 'object' &&
        'path' in body.params
      ) {
        keys.push(body.params.path);
      }

      queryClient.invalidateQueries(keys);

      return data as Data;
    },
    ...(mutationParams as Omit<UseMutationOptions<Data, Error>, 'mutationFn'>),
  });
}

export function usePutAsset<TFirstParam extends Parameters<typeof apiClient.put>[0]>(
  path: TFirstParam,
  mutationParams: Omit<UseMutationOptions, 'mutationFn'> = {},
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: Parameters<typeof apiClient.put<TFirstParam>>[1]) => {
      const state = useAuthStore.getState();

      if (process.env.NEXT_PUBLIC_USE_AUTH && !state.loggedIn) throw new Error('Not logged in');

      const { data } = await put(path, body);

      const keys: any[] = [path];
      if (
        typeof body === 'object' &&
        'params' in body &&
        typeof body.params === 'object' &&
        'path' in body.params
      ) {
        keys.push(body.params.path);
      }

      queryClient.invalidateQueries(keys);

      return data as QueryData<typeof apiClient.put<TFirstParam>>;
    },
    ...mutationParams,
  });
}

export const useDeleteAsset = <TFirstParam extends Parameters<typeof apiClient.del>[0]>(
  path: TFirstParam,
  mutationParams: Omit<UseMutationOptions, 'mutationFn'> = {},
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: Parameters<typeof apiClient.del<TFirstParam>>[1]) => {
      const { data } = await del(path, body);

      const keys: any[] = [path];
      if (
        typeof body === 'object' &&
        'params' in body &&
        typeof body.params === 'object' &&
        'path' in body.params
      ) {
        keys.push(body.params.path);
      }

      queryClient.invalidateQueries(keys);

      return data as QueryData<typeof apiClient.del<TFirstParam>>;
    },
    ...mutationParams,
  });
};

// We use distinct types for the
// if(data){
//   data[0].
// }collection and individual resource responses
// instead of `Item[]` because they might differ in what data they contain.

/**
 * IMPORTANT
 *
 * The following types are only temporary until we have converted the API to the
 * new NextJS framework. These types should ideally be automatically generated
 * from the database schema (e.g. using Prisma).
 */
