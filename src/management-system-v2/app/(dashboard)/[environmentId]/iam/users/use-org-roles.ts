import { useQuery } from '@tanstack/react-query';
import { getRoles, getRolesByType } from '@/lib/data/roles';

export default function useOrganizationRoles(spaceId: string, type?: string) {
  const { data, ...query } = useQuery({
    queryFn: async () => {
      const roles = await getRolesByType(spaceId, type || 'default');
      if ('error' in roles) throw new Error();
      return roles;
    },
    queryKey: ['roles', spaceId, type],
  });
  const roles = data?.filter((role) => !['@guest', '@everyone'].includes(role.name));

  // NOTE: this will break memoization down the line
  return {
    roles,
    ...query,
  };
}
