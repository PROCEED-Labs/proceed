import 'server-only';
import { Environment } from '@/lib/data/environment-schema';
import { getUserById } from '@/lib/data/db/iam/users';
import { User } from '@/lib/data/user-schema';
import { Result, err, ok } from 'neverthrow';

export function getUserName(user: User) {
  if (user.isGuest) return 'Guest';
  if (user.username) return user.username;
  if (user.firstName || user.lastName)
    return `${user.firstName ?? '<no first name>'} ${user.lastName ?? '<no last name>'}`;
  return user.id;
}

export type SpaceRepresentation = { id: string; name: string; type: string; owner: string };
export async function getSpaceRepresentation(spaces: Environment[]) {
  return Result.combine(
    await Promise.all(
      spaces.map(async (space) => {
        if (space.isOrganization && !space.isActive) {
          return ok({
            id: space.id,
            name: `${space.name}`,
            type: 'Organization',
            owner: 'None',
          });
        }

        const user = await getUserById(space.isOrganization ? space.ownerId : space.id);
        if (user.isErr()) return user;
        if (!user.value) err(new Error('Space user not found'));

        const userName = getUserName(user.value as User);

        if (space.isOrganization) {
          return ok({
            id: space.id,
            name: `${space.name}`,
            type: 'Organization',
            owner: userName,
          });
        }

        return ok({
          id: space.id,
          name: `Personal space: ${userName}`,
          type: 'Personal space',
          owner: userName,
        });
      }),
    ),
  );
}
