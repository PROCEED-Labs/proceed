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
import { getConfluenceClientInfos } from '@/lib/data/legacy/fileHandling';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { findPROCEEDMacrosInSpace } from './helpers';

const ConfluencePage = async ({ params, searchParams }: { params: any; searchParams: any }) => {
  console.log('searchparams', searchParams.jwt);
  const jwtToken = searchParams.jwt;

  if (!jwtToken) {
    return <span>Page can only be accessed inside of Confluence</span>;
  }

  const decoded = jwt.decode(jwtToken, { complete: true });
  const { iss: clientKey } = decoded!.payload as JwtPayload;
  console.log('clientKey', clientKey);

  if (!clientKey) {
    return <span>Page can only be accessed inside of Confluence</span>;
  }

  console.log('confluence page');
  const { userId } = await getCurrentUser();
  console.log('userId', userId);

  if (userId) {
    const userEnvironments: Environment[] = [getEnvironmentById(userId)];
    userEnvironments.push(
      ...getUserOrganizationEnvironments(userId).map((environmentId) =>
        getEnvironmentById(environmentId),
      ),
    );

    const confluenceClientInfos = await getConfluenceClientInfos(clientKey);
    const confluenceSelectedProceedSpace = userEnvironments.find(
      (environment) => environment.id === confluenceClientInfos.proceedSpace?.id,
    );

    if (!confluenceSelectedProceedSpace) {
      return <span>There is no selected PROCEED Space for this Confluence Domain. </span>;
    }

    const { ability } = await getCurrentEnvironment(confluenceSelectedProceedSpace.id);
    console.log('ability', ability);
    // get all the processes the user has access to
    const ownedProcesses = (await getProcesses(ability)) as Process[];

    console.log('userEnvironments', userEnvironments);

    const result = await findPROCEEDMacrosInSpace('~7120203a3f17e3744f4cd0accc1311bd5daad6');
    console.log('result', result);

    const ownedProcessesWithContainerInfo = ownedProcesses.map((process) => ({
      ...process,
      container: result[process.id],
    }));

    return (
      <Layout
        hideFooter={true}
        loggedIn={!!userId}
        layoutMenuItems={[]}
        userEnvironments={userEnvironments}
        activeSpace={{ spaceId: confluenceSelectedProceedSpace.id, isOrganization: true }}
      >
        <div style={{ padding: '1rem', width: '100%', minHeight: '600px' }}>
          <ManagableProcessList processes={ownedProcessesWithContainerInfo}></ManagableProcessList>
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
      <></>
    </Layout>
  );
};

export default ConfluencePage;
