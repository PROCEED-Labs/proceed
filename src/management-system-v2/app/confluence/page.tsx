import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { getProcesses } from '@/lib/data/legacy/_process';
import Layout from './layout-client';
import { Environment } from '@/lib/data/environment-schema';
import { getEnvironmentById } from '@/lib/data/legacy/iam/environments';
import { getUserOrganizationEnvironments } from '@/lib/data/legacy/iam/memberships';
import ManagableProcessList from './managable-process-list';
import { getConfluenceClientInfos } from '@/lib/data/legacy/fileHandling';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { findPROCEEDMacrosInSpace } from './helpers';
import { ConfluenceProceedProcess } from './process-list';

const ConfluencePage = async ({
  params,
  searchParams,
}: {
  params: any;
  searchParams: { jwt: string; spaceKey: string };
}) => {
  const jwtToken = searchParams.jwt;
  const spaceKey = searchParams.spaceKey;

  if (!jwtToken || !spaceKey) {
    return <span>Page can only be accessed inside of Confluence</span>;
  }

  const decoded = jwt.decode(jwtToken, { complete: true });
  const { iss: clientKey } = decoded!.payload as JwtPayload;

  if (!clientKey) {
    return <span>Page can only be accessed inside of Confluence</span>;
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
    const confluenceSelectedProceedSpace = userEnvironments.find(
      (environment) => environment.id === confluenceClientInfos.proceedSpace?.id,
    );

    if (!confluenceSelectedProceedSpace) {
      return <span>There is no selected PROCEED Space for this Confluence Domain. </span>;
    }

    const { ability } = await getCurrentEnvironment(confluenceSelectedProceedSpace.id);

    // get all the processes the user has access to
    const ownedProcesses = await getProcesses(ability);

    const result = await findPROCEEDMacrosInSpace(spaceKey);

    const ownedProcessesWithContainerInfo = ownedProcesses.map((process) => ({
      ...process,
      container: result[process.id],
    })) as ConfluenceProceedProcess[];

    return (
      <Layout
        hideFooter={true}
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
      activeSpace={{ spaceId: '', isOrganization: false }}
      redirectUrl="/confluence"
    >
      <></>
    </Layout>
  );
};

export default ConfluencePage;
