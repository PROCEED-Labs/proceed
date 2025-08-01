import { useQuery } from '@tanstack/react-query';
import { getRoles } from '@/lib/data/roles';

export default function useOrganizationRoles(spaceId: string) {
  const { data, ...query } = useQuery({
    queryFn: async () => {
      const roles = await getRoles(spaceId);
      if ('error' in roles) throw new Error();
      return roles;
    },
    queryKey: ['roles', spaceId],
  });
  const roles = data?.filter((role) => !['@guest', '@everyone'].includes(role.name));

  // NOTE: this will break memoization down the line
  return {
    roles,
    ...query,
  };
}
