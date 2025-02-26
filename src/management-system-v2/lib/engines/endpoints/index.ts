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

  if (engine.type === 'http')
    return await httpRequest(engine.address, builtEndpoint, method.toUpperCase() as any, body);

  const mqttClient = await getClient(engine.brokerAddress, !engine.spaceEngine);

  const response = await mqttRequest(
    engine.id,
    builtEndpoint,
    {
      method: method.toUpperCase() as any,
      body,
    },
    mqttClient,
  );

  // TODO: if multiple requests are sent, this will be called multiple times
  if (engine.spaceEngine) {
    // NOTE: not awaiting this could be a problem if hosted on vercel
    mqttClient.endAsync();
  }

  return response;
}
