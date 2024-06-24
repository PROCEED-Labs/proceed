import MacroEditor from './macro-editor';
import { getCurrentUser, getCurrentEnvironment } from '@/components/auth';
import { getProcesses } from '@/lib/data/legacy/_process';
import { getEnvironmentById } from '@/lib/data/legacy/iam/environments';
import { getUserOrganizationEnvironments } from '@/lib/data/legacy/iam/memberships';
import { Process } from '@/lib/data/process-schema';
import { Environment } from '@/lib/data/environment-schema';
import Layout from '../../layout-client';

const MacroEditorPage = async () => {
  const { userId } = await getCurrentUser();
  const { ability } = await getCurrentEnvironment(userId);
  // get all the processes the user has access to
  const ownedProcesses = (await getProcesses(ability)) as Process[];

  const userEnvironments: Environment[] = [getEnvironmentById(userId)];
  userEnvironments.push(
    ...getUserOrganizationEnvironments(userId).map((environmentId) =>
      getEnvironmentById(environmentId),
    ),
  );
  return (
    <Layout
      hideFooter
      loggedIn={!!userId}
      layoutMenuItems={[]}
      userEnvironments={userEnvironments}
      activeSpace={{ spaceId: userId || '', isOrganization: false }}
    >
      <MacroEditor processes={ownedProcesses}></MacroEditor>
    </Layout>
  );
};

export default MacroEditorPage;
