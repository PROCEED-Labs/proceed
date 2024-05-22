import Layout from '@/app/(dashboard)/[environmentId]/layout-client';
import Macro from './macro';
import { getCurrentUser } from '@/components/auth';
import { getEnvironmentById } from '@/lib/data/legacy/iam/environments';
import { getUserOrganizationEnviroments } from '@/lib/data/legacy/iam/memberships';
import { Environment } from '@/lib/data/environment-schema';
import { getProcessBPMN } from '@/lib/data/processes';

const MacroPage = async ({ params }: { params: { processId: string } }) => {
  const processId = params.processId;
  console.log('params', params);

  const { session, userId } = await getCurrentUser();
  console.log('userId', userId);

  const userEnvironments: Environment[] = [getEnvironmentById(userId)];
  userEnvironments.push(
    ...getUserOrganizationEnviroments(userId).map((environmentId) =>
      getEnvironmentById(environmentId),
    ),
  );

  const BPMN = await getProcessBPMN(processId, userId).then((res) => {
    if (typeof res === 'object' && 'error' in res) {
      throw res.error;
    }
    return res;
  });

  console.log('BPMN', BPMN);

  return (
    <>
      <Layout
        hideSider={true}
        loggedIn={!!userId}
        layoutMenuItems={[]}
        userEnvironments={userEnvironments}
        activeSpace={{ spaceId: userId || '', isOrganization: false }}
      >
        <Macro bpmn={BPMN} processId={processId}></Macro>
      </Layout>
    </>
  );
};

export default MacroPage;
