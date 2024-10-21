import { useEnvironment } from '@/components/auth-can';
import { getDeployments, DeployedProcessInfo } from '@/lib/engines/deployment';
import { QueryOptions, useQuery } from '@tanstack/react-query';

async function queryFn() {
  const res = await getDeployments();

  for (const deployment of res) {
    let latestVesrionIdx = deployment.versions.length - 1;
    for (let i = deployment.versions.length - 2; i >= 0; i--) {
      if (deployment.versions[i].version > deployment.versions[latestVesrionIdx].version)
        latestVesrionIdx = i;
    }
    const latestVersion = deployment.versions[latestVesrionIdx];

    // @ts-ignore
    deployment.name = latestVersion.versionName || latestVersion.definitionName;
  }

  return res as (DeployedProcessInfo & { name: string })[];
}

export default function useDeployments(
  queryOptions: QueryOptions<Awaited<ReturnType<typeof queryFn>>> = {},
) {
  const space = useEnvironment();

  return useQuery({
    queryFn,
    queryKey: ['processDeployments', space.spaceId],
    ...queryOptions,
  });
}
