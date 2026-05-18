import { useQuery } from '@tanstack/react-query';
import { getRoles } from '@/lib/data/roles';

export default function useOrganizationRoles(spaceId: string, type?: 'team' | 'back-office') {
  const { data, ...query } = useQuery({
    queryFn: async () => {
      let roles = await getRoles(spaceId);
      if ('error' in roles) throw new Error();
      roles = roles.filter((r) => !r.parentRoleId);
      return roles;
    },
    queryKey: ['roles', spaceId],
  });

  const roles = data
    ?.filter((role) => !['@guest', '@everyone'].includes(role.name))
    .filter((role) => (type ? role.organizationRoleType?.includes(type) : true));

  // NOTE: this will break memoization down the line
  return {
    roles,
    ...query,
  };
}
