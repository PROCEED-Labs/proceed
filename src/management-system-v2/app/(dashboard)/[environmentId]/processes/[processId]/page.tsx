import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import Wrapper from './wrapper';
import styles from './page.module.scss';
import Modeler from './modeler';
import { toCaslResource } from '@/lib/ability/caslAbility';
import AddUserControls from '@/components/add-user-controls';
import { getProcess, getProcesses, getUserById } from '@/lib/data/DTOs';
import { getProcessBPMN } from '@/lib/data/processes';

type ProcessProps = {
  params: { processId: string; environmentId: string };
  searchParams: { version?: string };
};

const Process = async ({ params: { processId, environmentId }, searchParams }: ProcessProps) => {
  // TODO: check if params is correct after fix release. And maybe don't need
  // refresh in processes.tsx anymore?
  //console.log('processId', processId);
  //console.log('query', searchParams);
  const selectedVersionId = searchParams.version ? +searchParams.version : undefined;
  const { ability } = await getCurrentEnvironment(environmentId);
  const { userId } = await getCurrentUser();
  // Only load bpmn if no version selected.
  const process = await getProcess(processId, !selectedVersionId);
  const processes = await getProcesses(userId, ability, false);

  if (!ability.can('view', toCaslResource('Process', process))) {
    throw new Error('Forbidden.');
  }

  const selectedVersionBpmn = selectedVersionId
    ? await getProcessBPMN(processId, environmentId, selectedVersionId)
    : process.bpmn;
  const selectedVersion = selectedVersionId
    ? process.versions.find((version: { version: number }) => version.version === selectedVersionId)
    : undefined;

  const inEditing = {
    ...(process.inEditingBy as any)?.find(
      (e: any) => e.userId !== userId && e.lastPing + 15000 > Date.now(),
    ),
  };

  // Get name of user who is editing
  if (inEditing) {
    const user = await getUserById(inEditing.userId, { throwIfNotFound: false });
    inEditing.name = user ? Object.hasOwn(user, 'username') ? (user as any).username : '' : '';
  }

  // Since the user is able to minimize and close the page, everyting is in a
  // client component from here.
  return (
    <>
      <Wrapper processName={process.name} processes={processes}>
        <Modeler
          className={styles.Modeler}
          process={{ ...process, bpmn: selectedVersionBpmn as string }}
          versions={process.versions}
          versionName={selectedVersion?.name}
          inEditing={inEditing}
        />
      </Wrapper>
      <AddUserControls name={'modeler'} />
    </>
  );
};

export default Process;
