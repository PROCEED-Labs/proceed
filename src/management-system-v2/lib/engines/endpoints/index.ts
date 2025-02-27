import { Prettify } from '@/lib/typescript-utils';
import { Engine } from '../machines';
import {
  Methods,
  AvailableEndpoints,
  _endpointBuilder,
  EndpointBuilderOptions,
} from './endpoint-builder';
import { httpRequest } from './http-endpoints';
import { getClient, mqttRequest } from './mqtt-endpoints';

export async function engineRequest<
  Method extends Methods,
  Url extends AvailableEndpoints<Method>,
>({
  engine,
  method,
  endpoint,
  body,
  ...params
}: {
  engine: Engine;
  method: Method;
  endpoint: Url;
  body?: any;
} & Prettify<EndpointBuilderOptions<Method, Url>>) {
  let queryParams;
  if ('queryParams' in params && engine.type === 'mqtt') {
    queryParams = params.queryParams;
    delete params.queryParams;
  }

  const builtEndpoint = 'params' in params ? _endpointBuilder(endpoint, params as any) : endpoint;

  if (engine.type === 'mqtt') {
    let spaceEngineClient;
    if (engine.spaceEngine) {
      spaceEngineClient = await getClient(engine.brokerAddress);
    }

    const response = await mqttRequest(
      engine.id,
      builtEndpoint,
      {
        method: method.toUpperCase() as any,
        query: queryParams as any,
        body,
      },
      spaceEngineClient,
    );

    // NOTE: not awaiting this could be a problem if hosted on vercel
    spaceEngineClient?.endAsync();

    return response;
  } else {
    return await httpRequest(engine.address, builtEndpoint, method.toUpperCase() as any, body);
  }
}
