type EndpointSchema = typeof import('./endpoints.json');
type Endpoints = EndpointSchema;
type Methods = 'get' | 'post' | 'put' | 'delete';

type GetParamsFromString<
  Str extends string,
  Count extends unknown[] = [],
> = Str extends `${infer Start}:${string}/${infer Rest}`
  ? Str extends `${Start}:${infer Param}/${Rest}`
    ? GetParamsFromString<Rest, [...Count, Param]>
    : Count
  : Str extends `${string}:${infer End}`
    ? [...Count, End]
    : Count;

type EndpointArgsArray<ParamsArray extends string[]> = ParamsArray extends []
  ? []
  : [Record<ParamsArray[number], string>];
type EndpointArgs<Endpoint extends string> = EndpointArgsArray<GetParamsFromString<Endpoint>>;

type AvailableEndpoints<Method extends Methods> = keyof Endpoints[Method] extends string
  ? keyof Endpoints[Method]
  : never;
export function endpointBuilder<Method extends Methods, Url extends AvailableEndpoints<Method>>(
  _: Method,
  endpoint: Url,
  ...options: EndpointArgs<Url>
) {
  return endpoint.replace(/:([^/]+)/g, (_, capture_group) => options[0]?.[capture_group] || '');
}
