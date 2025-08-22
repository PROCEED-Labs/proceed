import { DBSeed } from './lib/db-seed';

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
      initialPassword: process.env.PROCEED_ADMIN_INITIAL_PASSWORD || 'PROCEED',
    },
  ],
  organizations: [],
};
