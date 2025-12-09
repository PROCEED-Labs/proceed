import { DBSeed } from '@/lib/db-seed';
import { env } from '@/lib/ms-config/env-vars';

export const seedDbConfig: DBSeed = {
  version: '2025-08-01T00:00:00.000Z',
  systemSettings: {
    msAdministrators: ['admin'],
  },
  users: [
    {
      id: '00000000-0000-0000-0000-000000000000',
      username: 'admin',
      firstName: 'Admin',
      lastName: 'Admin',
      initialPassword: env.IAM_MS_ADMIN_INITIAL_PASSWORD,
    },
  ],
  organizations: [],
};
