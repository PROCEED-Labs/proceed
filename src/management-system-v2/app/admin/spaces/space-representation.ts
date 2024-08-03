import 'server-only';
import { Environment } from '@/lib/data/environment-schema';
import { getUserById } from '@/lib/data/legacy/iam/users';
import { User } from '@/lib/data/user-schema';

export function getUserName(user: User) {
  if (user.guest || 'confluence' in user) return 'Guest';
  if (user.username) return user.username;
  if (user.firstName || user.lastName)
    return `${user.firstName ?? '<no first name>'} ${user.lastName ?? '<no last name>'}`;
  return user.id;
}

export type SpaceRepresentation = { id: string; name: string; type: string; owner: string };
export function getSpaceRepresentation(spaces: Environment[]): SpaceRepresentation[] {
  return spaces.map((space) => {
    if (space.organization && !space.active)
      return {
        id: space.id,
        name: `${space.name}`,
        type: 'Organization',
        owner: 'None',
      };

    const user = getUserById(space.organization ? space.ownerId : space.id);
    if (!user) throw new Error('Space user not found');
    const userName = getUserName(user);

    if (space.organization)
      return {
        id: space.id,
        name: `${space.name}`,
        type: 'Organization',
        owner: userName,
      };

    return {
      id: space.id,
      name: `Personal space: ${userName}`,
      type: 'Personal space',
      owner: userName,
    };
  });
}
