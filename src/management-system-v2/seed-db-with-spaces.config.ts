import { DBSeed } from './lib/db-seed';

export const logosFromSeed = ['/home/felipetrost/Downloads/aaaa.png'];
export const seedDbConfig: DBSeed = {
  version: '2025-07-31T00:00:00.000Z',
  users: [
    {
      // uuid
      id: '00000000-0000-0000-0000-000000000001',
      username: 'john',
      firstName: 'John',
      lastName: 'Doe',
      initialPassword: 'password',
    },
  ],
  organizations: [
    {
      id: '40000000-0000-0000-0000-000000000001',
      name: 'Default Space',
      description: 'This is the default space',
      owner: 'john',
      members: ['john'],
      admins: ['john'],
      roles: [],
      spaceLogo: 'public/signin-flow.drawio.png',
    },
  ],
};
