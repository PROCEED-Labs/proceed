import MacroEditor from './macro-editor';
import { getCurrentUser, getCurrentEnvironment } from '@/components/auth';
import { getProcesses } from '@/lib/data/legacy/_process';
import { getEnvironmentById } from '@/lib/data/legacy/iam/environments';
import { getUserOrganizationEnviroments } from '@/lib/data/legacy/iam/memberships';
import { Process } from '@/lib/data/process-schema';
import { Environment } from '@/lib/data/environment-schema';

const MacroEditorPage = async () => {
  const { session, userId } = await getCurrentUser();
  const { ability } = await getCurrentEnvironment(userId);
  // get all the processes the user has access to
  const ownedProcesses = (await getProcesses(ability)) as Process[];

  const userEnvironments: Environment[] = [getEnvironmentById(userId)];
  userEnvironments.push(
    ...getUserOrganizationEnviroments(userId).map((environmentId) =>
      getEnvironmentById(environmentId),
    ),
  );
  return <MacroEditor processes={ownedProcesses} />;
};

export default MacroEditorPage;
