import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { getProcesses } from '@/lib/data/legacy/_process';
import { Process } from '@/lib/data/process-schema';
import Layout from '../layout-client';
import { Environment } from '@/lib/data/environment-schema';
import { getEnvironmentById } from '@/lib/data/legacy/iam/environments';
import { getUserOrganizationEnvironments } from '@/lib/data/legacy/iam/memberships';
import Config from './config';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { getConfluenceClientInfos } from '@/lib/data/legacy/fileHandling';

const ConfigPage = async ({ params, searchParams }: { params: any; searchParams: any }) => {
  const jwtToken = searchParams.jwt;
  const decoded = jwt.decode(jwtToken, { complete: true });
  const { iss: clientKey } = decoded!.payload as JwtPayload;

  if (!clientKey) {
    throw new Error('Could not extract ClientKey from given JWT Token');
  }

  const { userId } = await getCurrentUser();

  if (userId) {
    const userEnvironments: Environment[] = [getEnvironmentById(userId)];
    userEnvironments.push(
      ...getUserOrganizationEnvironments(userId).map((environmentId) =>
        getEnvironmentById(environmentId),
      ),
    );

    const confluenceClientInfos = await getConfluenceClientInfos(clientKey);

    return (
      <Layout
        hideFooter={true}
        loggedIn={!!userId}
        layoutMenuItems={[]}
        userEnvironments={userEnvironments}
        activeSpace={{ spaceId: userId || '', isOrganization: false }}
      >
        <div style={{ padding: '1rem', width: '100%' }}>
          <Config
            userEnvironments={userEnvironments}
            clientKey={clientKey}
            initialSpaceId={confluenceClientInfos.proceedSpace?.id}
          ></Config>
        </div>
      </Layout>
    );
  }

  return <div>Log In to continue</div>;
};

export default ConfigPage;
