import MacroEditor from './macro-editor';
import { Environment } from '@/lib/data/environment-schema';
import { getCurrentUser, getCurrentEnvironment } from '@/components/auth';
import { getProcesses } from '@/lib/data/legacy/_process';
import { getEnvironmentById } from '@/lib/data/legacy/iam/environments';
import { getUserOrganizationEnvironments } from '@/lib/data/legacy/iam/memberships';
import { Process } from '@/lib/data/process-schema';
import { getProcessBPMN } from '@/lib/data/processes';
import Layout from '../../layout-client';

const MacroEditorPage = async () => {
  const { session, userId } = await getCurrentUser();
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

  const userEnvironments: Environment[] = [getEnvironmentById(userId)];
  userEnvironments.push(
    ...getUserOrganizationEnvironments(userId).map((environmentId) =>
      getEnvironmentById(environmentId),
    ),
  );

  return (
    <>
      <Layout
        hideFooter
        loggedIn={!!userId}
        layoutMenuItems={[]}
        userEnvironments={userEnvironments}
        activeSpace={{ spaceId: userId || '', isOrganization: false }}
      >
        <MacroEditor processes={ownedProcesses}></MacroEditor>
      </Layout>
    </>
  );
};

export default MacroEditorPage;
