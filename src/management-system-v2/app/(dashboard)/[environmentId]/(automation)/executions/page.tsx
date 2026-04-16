import Content from '@/components/content';
import { getCurrentEnvironment } from '@/components/auth';
import DeploymentsView from './deployments-view';
import { getRootFolder, getFolderById, getFolderContents } from '@/lib/data/db/folders';
import { getUsersFavourites } from '@/lib/data/users';
import { isUserErrorResponse } from '@/lib/user-error';
import { getDeployments } from '@/lib/engines/server-actions';
import { asyncMap } from '@/lib/helpers/javascriptHelpers';
import { getProcess } from '@/lib/data/processes';

async function Executions({ environmentId }: { environmentId: string }) {
  const { ability, activeEnvironment } = await getCurrentEnvironment(environmentId);

  // TODO: check ability

  // TODO: once the legacy storage is dropped, it would be better to do one db transaction
  let [favs, [folder, folderContents], deployments] = await Promise.all([
    getUsersFavourites(),
    (async () => {
      const rootFolder = await getRootFolder(activeEnvironment.spaceId, ability);
      const folder = await getFolderById(rootFolder.id);
      const folderContents = await getFolderContents(folder.id, ability);
      return [folder, folderContents];
    })(),
    (async () => {
      const deployments = await getDeployments(activeEnvironment.spaceId);
      if (isUserErrorResponse(deployments)) return [];

      const groupedDeployments = Object.entries(
        deployments
          .filter((d) => !d.deleted)
          .reduce(
            (grouped, curr) => {
              const { processId, version, instances } = curr;
              const existingGroup = grouped[processId];
              if (existingGroup) {
                if (!existingGroup.versions.some((v) => v.id === curr.versionId)) {
                  existingGroup.versions.push(version);
                }
                existingGroup.instances = [...existingGroup.instances, ...instances];
              } else {
                grouped[curr.processId] = {
                  versions: [version],
                  instances: instances,
                };
              }

              return grouped;
            },
            {} as {
              [processId: string]: {
                versions: (typeof deployments)[number]['version'][];
                instances: (typeof deployments)[number]['instances'];
              };
            },
          ),
      );

      return asyncMap(groupedDeployments, async (group) => {
        const processId = group[0];

        const process = await getProcess(processId, activeEnvironment.spaceId);

        if (isUserErrorResponse(process)) throw process;

        return {
          id: processId,
          name: process.name,
          ...group[1],
        };
      });
    })(),
  ]);

  folderContents = folderContents.filter((p) => p.type === 'folder' || p.versions.length);

  return (
    <DeploymentsView
      processes={folderContents}
      folder={folder}
      favourites={favs as string[]}
      deployedProcesses={deployments}
    />
  );
}

export default async function ExecutionsPage(props: {
  params: Promise<{ environmentId: string }>;
}) {
  const params = await props.params;
  return (
    <Content title="Executions">
      <Executions environmentId={params.environmentId} />
    </Content>
  );
}
