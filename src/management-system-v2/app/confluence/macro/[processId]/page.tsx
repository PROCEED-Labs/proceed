import Layout from '../../layout-client';
import Macro from './macro';
import { getCurrentUser } from '@/components/auth';
import { getEnvironmentById } from '@/lib/data/legacy/iam/environments';
import { getUserOrganizationEnvironments } from '@/lib/data/legacy/iam/memberships';
import { Environment } from '@/lib/data/environment-schema';
import { getProcessBPMN } from '@/lib/data/processes';

const MacroPage = async ({ params }: { params: { processId: string } }) => {
  const processId = params.processId;
  console.log('params', params);

  const { userId } = await getCurrentUser();

  const userEnvironments: Environment[] = [getEnvironmentById(userId)];
  userEnvironments.push(
    ...getUserOrganizationEnvironments(userId).map((environmentId) =>
      getEnvironmentById(environmentId),
    ),
  );

  const BPMN = await getProcessBPMN(processId, userId).then((res) => {
    if (typeof res === 'object' && 'error' in res) {
      throw res.error;
    }
    return res;
  });

  return (
    <>
      <Layout
        hideFooter={true}
        loggedIn={!!userId}
        layoutMenuItems={[]}
        userEnvironments={userEnvironments}
        activeSpace={{ spaceId: userId || '', isOrganization: false }}
      >
        <Macro userId={userId} bpmn={BPMN} processId={processId}></Macro>
      </Layout>
    </>
  );
};

export default MacroPage;
