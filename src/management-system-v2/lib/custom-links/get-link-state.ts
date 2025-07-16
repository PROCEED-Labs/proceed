import 'server-only';
import { CustomNavigationLink } from './custom-link';
import mqtt from 'mqtt';

export async function checkCustomLinkStatus(link: CustomNavigationLink): Promise<boolean> {
  try {
    if (link.address.startsWith('http')) {
      const response = await fetch(link.address);
      return response.ok;
    } else if (link.address.startsWith('mqtt')) {
      // TODO: cache connections, but also different solution for serverless deployments.
      return await mqtt
        .connectAsync(link.address)
        .then((client) => {
          // TODO: check topic if given.
          client.end();
          return true;
        })
        .catch(() => false);
    } else {
      throw new Error('Unsupported URL protocol');
    }
  } catch (error) {
    return false;
  }
}
