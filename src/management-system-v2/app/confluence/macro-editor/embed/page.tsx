import MacroEditor from './macro-editor';
import { getCurrentUser, getCurrentEnvironment } from '@/components/auth';
import { getProcesses } from '@/lib/data/legacy/_process';
import { getEnvironmentById } from '@/lib/data/legacy/iam/environments';
import { getUserOrganizationEnvironments } from '@/lib/data/legacy/iam/memberships';
import { Process } from '@/lib/data/process-schema';
import { Environment } from '@/lib/data/environment-schema';
import Layout from '../../layout-client';
import { getConfluenceClientInfos } from '@/lib/data/legacy/fileHandling';
import jwt, { JwtPayload } from 'jsonwebtoken';

const MacroEditorPage = async ({ params, searchParams }: { params: any; searchParams: any }) => {
  const jwtToken = searchParams.jwt;

  if (!jwtToken) {
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
    const ownedProcesses = (await getProcesses(ability, true)) as Process[];

    return (
      <Layout
        hideFooter
        loggedIn={!!userId}
        layoutMenuItems={[]}
        userEnvironments={userEnvironments}
        activeSpace={{ spaceId: confluenceSelectedProceedSpace.id, isOrganization: true }}
      >
        <MacroEditor processes={ownedProcesses}></MacroEditor>
      </Layout>
    );
  }

  return (
    <Layout
      hideFooter
      loggedIn={false}
      layoutMenuItems={[]}
      userEnvironments={[]}
      activeSpace={{ spaceId: '', isOrganization: false }}
      redirectUrl="/confluence/macro-editor/embed"
    >
      <></>
    </Layout>
  );
};

export default MacroEditorPage;
