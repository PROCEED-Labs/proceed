import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { getProcesses } from '@/lib/data/legacy/_process';
import { Process } from '@/lib/data/process-schema';
import Layout from '../layout-client';
import { Environment } from '@/lib/data/environment-schema';
import { getEnvironmentById } from '@/lib/data/legacy/iam/environments';
import { getUserOrganizationEnvironments } from '@/lib/data/legacy/iam/memberships';
import Config from './config';

const ConfigPage = async ({ params, searchParams }: { params: any; searchParams: any }) => {
  console.log('query', searchParams);
  const jwt = searchParams.jwt;
  const res = await fetch('https://proceed-test.atlassian.net/wiki/api/v2/pages', {
    method: 'GET',
    headers: {
      Authorization: `JWT ${jwt}`,
    },
  });
  console.log('res', res);
  const { session, userId } = await getCurrentUser();
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
      hideFooter={true}
      loggedIn={!!userId}
      layoutMenuItems={[]}
      userEnvironments={userEnvironments}
      activeSpace={{ spaceId: userId || '', isOrganization: false }}
    >
      <div style={{ padding: '1rem', width: '100%' }}>
        <Config userEnvironments={userEnvironments}></Config>
      </div>
    </Layout>
  );
};

export default ConfigPage;
