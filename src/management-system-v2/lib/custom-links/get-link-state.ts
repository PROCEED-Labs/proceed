import 'server-only';
import { CustomNavigationLink } from './custom-link';

export async function checkCustomLinkStatus(link: CustomNavigationLink): Promise<boolean> {
  try {
    if (link.address.startsWith('http')) {
      const response = await fetch(link.address);
      return response.ok;
    } else if (link.address.startsWith('mqtt')) {
      // TODO: mqtt
      return false;
    } else {
      throw new Error('Unsupported URL protocol');
    }
  } catch (error) {
    return false;
  }
}
