'use client';

import {
  UseMutationOptions,
  UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import createClient, { FetchOptions, FetchResponse } from 'openapi-fetch';
import { FilterKeys, PathsWithMethod } from 'openapi-typescript-helpers';
import { paths } from './openapiSchema';
import { useCallback, useMemo } from 'react';
import { useCsrfTokenStore } from './csrfTokenStore';
import { Prettify } from './typescript-utils';

const BASE_URL = process.env.API_URL;
type Paths = paths extends Record<string, any> ? paths : never;
const apiClient = createClient<paths>({ baseUrl: BASE_URL });
function addAuthHeaders<TApiCall extends (typeof apiClient)[keyof typeof apiClient]>(
  call: TApiCall,
) {
  // @ts-ignore
  const wrappedFunction = async (path, options) => {
    const csrfToken = useCsrfTokenStore.getState().csrfToken;
    // @ts-ignore
    const response = await (call as (...args: any[]) => Promise<any>)(path, {
      credentials: process.env.NEXT_PUBLIC_USE_AUTH
        ? process.env.NODE_ENV === 'production'
          ? 'same-origin'
          : 'include'
        : undefined,
      headers: {
        'csrf-token': csrfToken,
      },
      // @ts-ignore
      ...options,
    });

    if (response.error) throw response.error;

    if (response.data === undefined)
      throw new Error(`Error fetching: ${response.response.statusText}`);

    return response;
  };

  return wrappedFunction;
}

export const get: <P extends PathsWithMethod<Paths, 'get'>>(
  url: P,
  init: FetchOptions<FilterKeys<Paths[P], 'get'>>,
) => Promise<
  FetchResponse<
    'get' extends infer T
      ? T extends 'get'
        ? T extends keyof Paths[P]
          ? Paths[P][T]
          : unknown
        : never
      : never
  >
> = addAuthHeaders(apiClient.GET);
export const post: <P_2 extends PathsWithMethod<Paths, 'post'>>(
  url: P_2,
  init: FetchOptions<FilterKeys<Paths[P_2], 'post'>>,
) => Promise<
  FetchResponse<
    'post' extends infer T_2
      ? T_2 extends 'post'
        ? T_2 extends keyof Paths[P_2]
          ? Paths[P_2][T_2]
          : unknown
        : never
      : never
  >
> = addAuthHeaders(apiClient.POST);
export const put: <P_1 extends PathsWithMethod<Paths, 'put'>>(
  url: P_1,
  init: FetchOptions<FilterKeys<Paths[P_1], 'put'>>,
) => Promise<
  FetchResponse<
    'put' extends infer T_1
      ? T_1 extends 'put'
        ? T_1 extends keyof Paths[P_1]
          ? Paths[P_1][T_1]
          : unknown
        : never
      : never
  >
> = addAuthHeaders(apiClient.PUT);
export const del: <P_3 extends PathsWithMethod<Paths, 'delete'>>(
  url: P_3,
  init: FetchOptions<FilterKeys<Paths[P_3], 'delete'>>,
) => Promise<
  FetchResponse<
    'delete' extends infer T_3
      ? T_3 extends 'delete'
        ? T_3 extends keyof Paths[P_3]
          ? Paths[P_3][T_3]
          : unknown
        : never
      : never
  >
> = addAuthHeaders(apiClient.DELETE);

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

function getKeys(path: any, params: any) {
  const keys = [path];

  if (typeof params === 'object' && 'params' in params && typeof params.params === 'object') {
    keys.push(params.params as any);
  }

  return keys;
}

export function useGetAsset<
  TFirstParam extends Parameters<typeof apiClient.GET>[0],
  TSecondParam extends Parameters<typeof apiClient.GET<TFirstParam>>[1],
>(path: TFirstParam, params: TSecondParam, reactQueryOptions?: Omit<UseQueryOptions, 'queryFn'>) {
  const keys = useMemo(() => getKeys(path, params), [path, params]);

  type Data = QueryData<typeof apiClient.GET<TFirstParam>> | undefined;

  return useQuery({
    // eslint-disable-next-line
    queryKey: keys,
    queryFn: async () => {
      const { data } = await get(path, params as any);
      return data as Data;
    },
    ...(reactQueryOptions as UseQueryOptions<Data, Error> | undefined),
  });
}

export function usePutAsset<TFirstParam extends Parameters<typeof apiClient.PUT>[0]>(
  path: TFirstParam,
  mutationParams: Omit<
    UseMutationOptions<
      QueryData<typeof apiClient.PUT<TFirstParam>>,
      unknown,
      FetchOptions<FilterKeys<paths[TFirstParam], 'put'>>
    >,
    'mutationFn'
  > = {},
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: FetchOptions<FilterKeys<Paths[TFirstParam], 'put'>>) => {
      const { data } = await put(path, body);

      queryClient.invalidateQueries(getKeys(path, body) as any);

      return data as QueryData<typeof apiClient.PUT<TFirstParam>>;
    },
    ...mutationParams,
  });
}

export const useDeleteAsset = <TFirstParam extends Parameters<typeof apiClient.DELETE>[0]>(
  path: TFirstParam,
  mutationParams: Omit<
    UseMutationOptions<
      QueryData<typeof apiClient.DELETE<TFirstParam>>,
      unknown,
      FetchOptions<FilterKeys<paths[TFirstParam], 'delete'>>
    >,
    'mutationFn'
  > = {},
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: FetchOptions<FilterKeys<Paths[TFirstParam], 'delete'>>) => {
      const { data } = await del(path, body);

      queryClient.invalidateQueries(getKeys(path, body) as any);

      return data as QueryData<typeof apiClient.DELETE<TFirstParam>>;
    },
    ...mutationParams,
  });
};
