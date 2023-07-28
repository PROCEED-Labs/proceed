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

export function useGetAsset<
  TFirstParam extends Parameters<typeof apiClient.get>[0],
  TSecondParam extends Parameters<typeof apiClient.get<TFirstParam>>[1]
>(
  path: TFirstParam,
  params: TSecondParam['params'],
  reactQueryOptions?: Omit<UseQueryOptions, 'queryFn'>
) {
  const keys = useMemo(() => {
    const keys = [path];
    if (params && (params as any).path) {
      keys.push((params as any).path);
    }

    return keys;
  }, [path, params]);

  type Data = QueryData<typeof apiClient.get<TFirstParam>>;

  return useQuery({
    // eslint-disable-next-line
    queryKey: keys,
    queryFn: async () => {
      const { data, error, response } = await apiClient.get(path, {
        params,
      } as TSecondParam);

      if (error || data === undefined) throw new Error(`Error fetching: ${response.statusText}`);

      return data as Data;
    },
    ...(reactQueryOptions as UseQueryOptions<Data, Error>),
  });
}

export function usePostAsset<TFirstParam extends Parameters<typeof apiClient.post>[0]>(
  path: TFirstParam
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: Parameters<typeof apiClient.post<TFirstParam>>[1]) => {
      const { response, data, error } = await apiClient.post(path, body);

      if (error) throw new Error(`Error calling POST:${path} -> ${response.body}`);

      queryClient.invalidateQueries([path, (body as any).params.path]);

      return data as QueryData<typeof apiClient.post<TFirstParam>>;
    },
  });
}

export function usePutAsset<TFirstParam extends Parameters<typeof apiClient.put>[0]>(
  path: TFirstParam
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: Parameters<typeof apiClient.put<TFirstParam>>[1]) => {
      const { response, data, error } = await apiClient.put(path, body);

      if (error) throw new Error(`Error calling POST:${path} -> ${response.body}`);

      queryClient.invalidateQueries([path, (body as any).params.path]);

      return data as QueryData<typeof apiClient.put<TFirstParam>>;
    },
  });
}

export const useDeleteAsset = <TFirstParam extends Parameters<typeof apiClient.del>[0]>(
  path: TFirstParam
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: Parameters<typeof apiClient.del<TFirstParam>>[1]) => {
      const { response, data, error } = await apiClient.del(path, body);

      if (error) throw new Error(`Error calling POST:${path} -> ${response.body}`);

      queryClient.invalidateQueries([path, (body as any).params.path]);

      return data as QueryData<typeof apiClient.del<TFirstParam>>;
    },
  });
};

const fetchJSON = async <T>(url: string, options = {}) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json() as Promise<T>;
};

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

/**
 * IMPORTANT
 *
 * The following types are only temporary until we have converted the API to the
 * new NextJS framework. These types should ideally be automatically generated
 * from the database schema (e.g. using Prisma).
 */

export type Processes = {
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
  versions: [];
  definitionId: string;
  definitionName: string;
}[];
