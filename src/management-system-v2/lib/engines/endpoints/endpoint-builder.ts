export type Methods = 'get' | 'post' | 'put' | 'delete';

// Endpoints
type EndpointSchema = typeof import('./endpoints.json');
type Endpoints = EndpointSchema;
export type AvailableEndpoints<Method extends Methods> = keyof Endpoints[Method] extends string
  ? keyof Endpoints[Method]
  : never;

// Endpoint params
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

type EndpointArgsArray<ParamsArray extends string[]> = ParamsArray extends []
  ? []
  : [Record<ParamsArray[number], string>];

// Endpoint builders

// No type safety
export function _endpointBuilder(endpoint: string, options?: Record<string, string>) {
  return endpoint.replace(/:([^/]+)/g, (_, capture_group) => options?.[capture_group] || '');
}
export default function endpointBuilder<
  Method extends Methods,
  Url extends AvailableEndpoints<Method>,
>(_: Method, endpoint: Url, ...options: EndpointArgsArray<GetParamsFromString<Url>>) {
  return _endpointBuilder(endpoint, ...options);
}
