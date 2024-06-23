import Layout from '../../layout-client';
import Macro from './macro';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { getEnvironmentById } from '@/lib/data/legacy/iam/environments';
import { getUserOrganizationEnvironments } from '@/lib/data/legacy/iam/memberships';
import { Environment } from '@/lib/data/environment-schema';
import { getProcessBPMN } from '@/lib/data/processes';
import { getProcesses } from '@/lib/data/legacy/process';
import { Process } from '@/lib/data/process-schema';

const MacroPage = async ({ params }: { params: { processId: string } }) => {
  const processId = params.processId;
  console.log('params', params);

  const { userId } = await getCurrentUser();
  const { ability } = await getCurrentEnvironment(userId);

  // get all the processes the user has access to
  const ownedProcesses = (
    await Promise.all(
      (await getProcesses(ability)).map(async (process) => {
        const res = await getProcessBPMN(process.id, userId);
        if (typeof res === 'string') {
          return { ...process, bpmn: res };
        }
        return { ...process };
      }),
    )
  ).filter((process) => !!('bpmn' in process)) as Process[];

  const process: Process = ownedProcesses.find((p) => p.id === processId)!;

  const userEnvironments: Environment[] = [getEnvironmentById(userId)];
  userEnvironments.push(
    ...getUserOrganizationEnvironments(userId).map((environmentId) =>
      getEnvironmentById(environmentId),
    ),
  );

  return (
    <>
      <Layout
        hideFooter={true}
        loggedIn={!!userId}
        layoutMenuItems={[]}
        userEnvironments={userEnvironments}
        activeSpace={{ spaceId: userId || '', isOrganization: false }}
      >
        <Macro process={process}></Macro>
      </Layout>
    </>
  );
};

export default MacroPage;
