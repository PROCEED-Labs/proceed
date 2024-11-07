import Layout from '../../layout-client';
import Macro from './macro';
import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import { getEnvironmentById } from '@/lib/data/legacy/iam/environments';
import { getUserOrganizationEnvironments } from '@/lib/data/legacy/iam/memberships';
import { Environment } from '@/lib/data/environment-schema';
import { getProcessBPMN } from '@/lib/data/processes';
import { getProcesses } from '@/lib/data/legacy/process';
import { Process } from '@/lib/data/process-schema';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { getConfluenceClientInfos } from '@/lib/data/legacy/fileHandling';
import { asyncMap } from '@/lib/helpers/javascriptHelpers';

const MacroPage = async ({
  params,
  searchParams,
}: {
  params: { processId: string };
  searchParams: any;
}) => {
  const jwtToken = searchParams.jwt;

  if (!jwtToken) {
    return <span>Page can only be accessed inside of Confluence</span>;
  }

  const decoded = jwt.decode(jwtToken, { complete: true });
  const { iss: clientKey } = decoded!.payload as JwtPayload;

  if (!clientKey) {
    return <span>Page can only be accessed inside of Confluence</span>;
  }

  const processId = params.processId;

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

    if (!confluenceSelectedProceedSpace) {
      return <span>There is no selected PROCEED Space for this Confluence Domain. </span>;
    }

    const { ability } = await getCurrentEnvironment(confluenceSelectedProceedSpace.id);

    // get all the processes the user has access to in the selected space for confluence
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

    const process = ownedProcesses.find((p) => p.id === processId);

    return (
      <>
        <Layout
          hideFooter={true}
          activeSpace={{ spaceId: confluenceSelectedProceedSpace.id, isOrganization: true }}
        >
          {process ? (
            <Macro process={process}></Macro>
          ) : (
            <span>Process not found for {userId}</span>
          )}
        </Layout>
      </>
    );
  }

  return (
    <Layout
      hideFooter
      activeSpace={{ spaceId: '', isOrganization: false }}
      redirectUrl={`/confluence/macro/${processId}`}
    >
      <></>
    </Layout>
  );
};

export default MacroPage;
