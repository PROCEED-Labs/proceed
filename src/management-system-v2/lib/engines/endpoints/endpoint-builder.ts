import { Prettify } from '@/lib/typescript-utils';

/* -------------------------------------------------------------------------------------------------
 * Endpoint schema
 * -----------------------------------------------------------------------------------------------*/
export type Methods = 'get' | 'post' | 'put' | 'delete';
type EndpointSchema = typeof import('./endpoints.json');
type Endpoints = EndpointSchema;
export type AvailableEndpoints<Method extends Methods> = keyof Endpoints[Method] extends string
  ? keyof Endpoints[Method]
  : never;

/* -------------------------------------------------------------------------------------------------
 * Path params
 * -----------------------------------------------------------------------------------------------*/
type GetParamsFromString<
  Str extends string,
  Params extends unknown[] = [],
> = Str extends `${infer Start}:${string}/${infer Rest}`
  ? Str extends `${Start}:${infer Param}/${Rest}`
    ? GetParamsFromString<Rest, [...Params, Param]>
    : Params
  : Str extends `${string}:${infer End}`
    ? [...Params, End]
    : Params;

type _EndpointParams<ParamsArray extends string[]> = ParamsArray extends []
  ? never
  : Record<ParamsArray[number], string>;
export type EndpointParams<Url extends string> = _EndpointParams<GetParamsFromString<Url>>;

type PathParamsOptions<ParamsArray extends string[]> = ParamsArray extends []
  ? never
  : Record<ParamsArray[number], string>;

/* -------------------------------------------------------------------------------------------------
 * Query params
 * -----------------------------------------------------------------------------------------------*/
export type QueryParamsOptionsArray<
  Method extends Methods,
  Url extends AvailableEndpoints<Method>,
> = EndpointSchema[Method][Url] extends { queryParams: any }
  ? Partial<Record<keyof EndpointSchema[Method][Url]['queryParams'], string>>
  : never;

/* -------------------------------------------------------------------------------------------------
 * Endpoint builder
 * -----------------------------------------------------------------------------------------------*/
type RemoveNeverKeys<T> = {
  [K in keyof T as T[K] extends never ? never : K]: T[K];
};

export type EndpointBuilderOptions<
  Method extends Methods,
  Url extends AvailableEndpoints<Method>,
> = RemoveNeverKeys<
  { pathParams: PathParamsOptions<GetParamsFromString<Url>> } & {
    queryParams?: QueryParamsOptionsArray<Method, Url>;
  }
>;
type _Options<OptionsObject> = keyof OptionsObject extends never ? [] : [OptionsObject];
export type Options<Method extends Methods, Url extends AvailableEndpoints<Method>> = Prettify<
  _Options<EndpointBuilderOptions<Method, Url>>
>;

// No type safety
export function _endpointBuilder(
  endpoint: string,
  options?: { pathParams?: Record<string, string>; queryParams?: Record<string, string> },
) {
  let builtEndpoint = endpoint.replace(
    /:([^/]+)/g,
    (_, capture_group) => options?.pathParams?.[capture_group] || '',
  );

  if (options?.queryParams && Object.keys(options.queryParams).length > 0) {
    const searchParams = new URLSearchParams(options.queryParams);
    builtEndpoint += `?${searchParams.toString()}`;
  }

  return builtEndpoint;
}

export default function endpointBuilder<
  Method extends Methods,
  Url extends AvailableEndpoints<Method>,
>(_: Method, endpoint: Url, ...options: Options<Method, Url>) {
  return _endpointBuilder(endpoint, (options as any)?.[0]);
}
