'use server';

import { getCurrentUser } from '@/components/auth';
import { getSystemAdminByUserId } from '../data/DTOs';
import { UserErrorType, userError } from '../user-error';
import { mqttRequest as _mqttRequest } from './mqtt-endpoints';

export async function mqttRequest(...args: Parameters<typeof _mqttRequest>) {
  const user = await getCurrentUser();
  if (!user.session) return userError('Not signed in', UserErrorType.NotLoggedInError);
  const adminData = getSystemAdminByUserId(user.userId);
  if (!adminData) return userError('Not allowed', UserErrorType.PermissionError);

  try {
    return await _mqttRequest(...args);
  } catch (e) {
    console.error(e);
    userError('Request failed');
  }
}
