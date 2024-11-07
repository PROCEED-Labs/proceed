import MacroEditor from './macro-editor';
import { Environment } from '@/lib/data/environment-schema';
import { getCurrentUser, getCurrentEnvironment } from '@/components/auth';
import { getProcesses } from '@/lib/data/legacy/_process';
import { getEnvironmentById } from '@/lib/data/legacy/iam/environments';
import { getUserOrganizationEnvironments } from '@/lib/data/legacy/iam/memberships';
import { Process } from '@/lib/data/process-schema';
import { getProcessBPMN } from '@/lib/data/processes';
import Layout from '../../layout-client';
import { getConfluenceClientInfos } from '@/lib/data/legacy/fileHandling';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { getRootFolder } from '@/lib/data/legacy/folders';
import { asyncMap } from '@/lib/helpers/javascriptHelpers';

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
    const userEnvironments: Environment[] = [await getEnvironmentById(userId)];
    const userOrganizationEnvironments = await getUserOrganizationEnvironments(userId);

    userEnvironments.push(
      ...(await asyncMap(userOrganizationEnvironments, async (environmentId) => {
        return getEnvironmentById(environmentId);
      })),
    );

    const confluenceClientInfos = await getConfluenceClientInfos(clientKey);
    const confluenceSelectedProceedSpace = userEnvironments.find(
      (environment) => environment.id === confluenceClientInfos.proceedSpace?.id,
    );

    if (!confluenceSelectedProceedSpace || !confluenceClientInfos.proceedSpace) {
      return <span>There is no selected PROCEED Space for this Confluence Domain. </span>;
    }

    const { ability } = await getCurrentEnvironment(confluenceSelectedProceedSpace.id);

    getRootFolder(confluenceSelectedProceedSpace.id, ability);

    // get all the processes the user has access to
    const ownedProcesses = (
      await Promise.all(
        (await getProcesses(userId, ability)).map(async (process) => {
          const res = await getProcessBPMN(process.id, confluenceSelectedProceedSpace.id);
          if (typeof res === 'string') {
            return { ...process, bpmn: res };
          }
          return { ...process };
        }),
      )
    ).filter((process) => !!('bpmn' in process)) as Process[];

    return (
      <>
        <Layout
          hideFooter
          activeSpace={{ spaceId: confluenceSelectedProceedSpace.id, isOrganization: true }}
        >
          <MacroEditor
            confluenceFolderId={confluenceClientInfos.proceedSpace.confluenceFolderId}
            processes={ownedProcesses}
          ></MacroEditor>
        </Layout>
      </>
    );
  }

  return (
    <Layout
      hideFooter
      activeSpace={{ spaceId: '', isOrganization: false }}
      redirectUrl="/confluence/macro-editor/create"
    >
      <></>
    </Layout>
  );
};

export default MacroEditorPage;
