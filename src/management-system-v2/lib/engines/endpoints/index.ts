import { Prettify } from '@/lib/typescript-utils';
import { Engine, isMqttConnection } from '../types';
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
  for (const { reachable, connection } of engine.connections) {
    if (!reachable) continue;
    try {
      let queryParams;
      if ('queryParams' in params && isMqttConnection(connection)) {
        queryParams = params.queryParams;
        delete params.queryParams;
      }

      const builtEndpoint = _endpointBuilder(endpoint, params);

      let response;
      if (isMqttConnection(connection)) {
        let spaceEngineClient;
        try {
          spaceEngineClient = await getClient(connection.address);
        } catch (err) {
          continue;
        }

        response = await mqttRequest(
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
        if (engine.spaceEngine) {
          // TODO: removed because sometimes the same client is used for multiple requests.
          //spaceEngineClient?.endAsync();
        }
      } else {
        response = await httpRequest(
          connection.address,
          builtEndpoint,
          method.toUpperCase() as any,
          body,
        );
      }

      if (response.error) {
        // the request could be sent but the result was an error
        throw response.error;
      } else {
        return response.result;
      }
    } catch (err) {
      // the request itself failed => try other connections if there are any
      continue;
    }
  }

  throw new Error('Failed to establish a connection to the requested engine.');
}
