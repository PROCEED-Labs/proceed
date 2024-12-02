import { Engine } from '../machines';
import { EndpointParams, Methods, AvailableEndpoints, _endpointBuilder } from './endpoint-builder';
import { httpRequest } from './http-endpoints';
import { mqttRequest } from './mqtt-endpoints';

export function engineRequest<Method extends Methods, Url extends AvailableEndpoints<Method>>({
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

  if ('id' in engine) {
    return mqttRequest(engine.id, builtEndpoint, {
      method: method.toUpperCase() as any,
      body,
    });
  } else {
    return httpRequest(engine.address, builtEndpoint, method.toUpperCase() as any, body);
  }
}
