import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { getProcesses } from '@/lib/data/legacy/_process';
import { Process } from '@/lib/data/process-schema';
import Layout from './layout-client';
import { Environment } from '@/lib/data/environment-schema';
import { getEnvironmentById } from '@/lib/data/legacy/iam/environments';
import { getUserOrganizationEnvironments } from '@/lib/data/legacy/iam/memberships';
import ManagableProcessList from './managable-process-list';
import { headers, cookies } from 'next/headers';
import { signIn } from 'next-auth/react';

const ConfluencePage = async ({ params, searchParams }: { params: any; searchParams: any }) => {
  const jwt = searchParams.jwt;
  console.log('jwt', jwt);
  // const signInRes = await signIn('confluence-signin', { token: jwt, redirect: false });
  // console.log('signInRes', signInRes);

  // const headersList = headers();
  // const headersObject = Object.fromEntries(headersList.entries());
  // console.log(headersObject);
  // const cookiesList = cookies().getAll();
  // console.log(cookiesList);
  console.log('confluence page');
  const { userId } = await getCurrentUser();
  console.log('userId', userId);

  if (userId) {
    const { ability } = await getCurrentEnvironment(userId);
    console.log('ability', ability);
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
        <div style={{ padding: '1rem', width: '100%', minHeight: '600px' }}>
          <ManagableProcessList processes={ownedProcesses}></ManagableProcessList>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      hideFooter={true}
      loggedIn={false}
      layoutMenuItems={[]}
      userEnvironments={[]}
      activeSpace={{ spaceId: '', isOrganization: false }}
      redirectUrl="/confluence"
    >
      <span>OKAY</span>
    </Layout>
  );
};

export default ConfluencePage;
