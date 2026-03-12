import { useQuery } from '@tanstack/react-query';
import { getRoles } from '@/lib/data/roles';

export default function useOrganizationRoles(spaceId: string, type?: 'team' | 'back-office') {
  const { data, ...query } = useQuery({
    queryFn: async () => {
      const roles = await getRoles(spaceId);
      if ('error' in roles) throw new Error();
      return roles;
    },
    queryKey: ['roles', spaceId],
  });
  const roles = data?.filter((role) => {
    // Always exclude system roles
    if (['@guest', '@everyone'].includes(role.name)) return false;

    // If type filter provided then only return roles that include that type
    if (type) return role.organizationRoleType?.includes(type);

    // If no type filter then return all roles
    return true;
  });
  // NOTE: this will break memoization down the line
  return {
    roles,
    ...query,
  };
}
