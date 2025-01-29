import { Engine } from '../machines';
import { EndpointParams, Methods, AvailableEndpoints, _endpointBuilder } from './endpoint-builder';
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
} & (NoInfer<EndpointParams<Url>> extends never ? {} : { params: NoInfer<EndpointParams<Url>> })) {
  const builtEndpoint =
    'params' in params ? _endpointBuilder(endpoint, params.params as any) : endpoint;

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
