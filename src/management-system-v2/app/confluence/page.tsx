import { Space } from 'antd';
import ProcessList from './process-list';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { getProcesses } from '@/lib/data/legacy/_process';
import { Process } from '@/lib/data/process-schema';
import Layout from '@/app/(dashboard)/[environmentId]/layout-client';
import { Environment } from '@/lib/data/environment-schema';
import { getEnvironmentById } from '@/lib/data/legacy/iam/environments';
import { getUserOrganizationEnviroments } from '@/lib/data/legacy/iam/memberships';

const ConfluencePage = async () => {
  const { session, userId } = await getCurrentUser();
  const { ability } = await getCurrentEnvironment(userId);
  // get all the processes the user has access to
  const ownedProcesses = (await getProcesses(ability)) as Process[];

  const userEnvironments: Environment[] = [getEnvironmentById(userId)];
  userEnvironments.push(
    ...getUserOrganizationEnviroments(userId).map((environmentId) =>
      getEnvironmentById(environmentId),
    ),
  );

  return (
    <Layout
      hideSider={true}
      loggedIn={!!userId}
      layoutMenuItems={[]}
      userEnvironments={userEnvironments}
      activeSpace={{ spaceId: userId || '', isOrganization: false }}
    >
      <div style={{ padding: '1rem', width: '100%' }}>
        <ProcessList processes={ownedProcesses}></ProcessList>
      </div>
    </Layout>
  );
};

export default ConfluencePage;
