import { CustomNavigationLink } from '@/app/(dashboard)/[environmentId]/settings/@generalSettings/custom-navigation-links';
import 'server-only';

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
    console.error('Error checking custom link status:', error);
    return false;
  }
}
