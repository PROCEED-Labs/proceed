import { useEnvironment } from '@/components/auth-can';
import { getDeployments, DeployedProcessInfo } from '@/lib/engines/deployment';
import { deepEquals } from '@/lib/helpers/javascriptHelpers';
import { QueryOptions, useQuery } from '@tanstack/react-query';
import { getNewestDeployment } from './[processId]/instance-helpers';

async function queryFn() {
  const res = await getDeployments();

  for (const deployment of res) {
    const latestVersion = getNewestDeployment(deployment);

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
    refetchInterval: 5000,
    // return the same data if nothing has changed from the last fetch to prevent unnecessary
    // rerenders
    structuralSharing: (oldQuery, newQuery) => {
      if (!Array.isArray(oldQuery) || !Array.isArray(newQuery)) return newQuery;
      const oldData = oldQuery as DeployedProcessInfo[];
      const newData = newQuery as DeployedProcessInfo[];

      // merge old data into the new data to reduce the amount of rerenders in components that will
      // use the deployment data
      // TODO: this might be optimized in a specialized function that does a merge with a single
      // iteration through the object tree
      if (deepEquals(oldData, newData)) {
        return oldData;
      } else {
        for (let i = 0; i < newData.length; ++i) {
          const newDeployment = newData[i];
          const oldDeploymentIndex = oldData.findIndex(
            (d) => d.definitionId === newDeployment.definitionId,
          );

          if (oldDeploymentIndex > -1) {
            const oldDeployment = oldData[oldDeploymentIndex];
            if (deepEquals(newDeployment, oldDeployment)) {
              newData[i] = oldDeployment;
            } else {
              for (let j = 0; j < newDeployment.versions.length; ++j) {
                const newVersion = newDeployment.versions[j];
                const oldVersionIndex = oldDeployment.versions.findIndex(
                  (v) => v.versionId === newVersion.versionId,
                );

                if (oldVersionIndex > -1) {
                  const oldVersion = oldDeployment.versions[oldVersionIndex];
                  if (deepEquals(newVersion, oldVersion)) {
                    newDeployment.versions[j] = oldVersion;
                  }
                }
              }

              for (let j = 0; j < newDeployment.instances.length; ++j) {
                const newInstance = newDeployment.instances[j];
                const oldInstanceIndex = oldDeployment.instances.findIndex(
                  (instance) => instance.processInstanceId === newInstance.processInstanceId,
                );

                if (oldInstanceIndex > -1) {
                  const oldInstance = oldDeployment.instances[oldInstanceIndex];
                  if (deepEquals(newInstance, oldInstance)) {
                    newDeployment.instances[j] = oldInstance;
                  }
                }
              }
            }
          }
        }
      }

      return newData;
    },
  });
}
