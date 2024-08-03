import { getCurrentEnvironment, getCurrentUser } from '@/components/auth';
import Wrapper from './wrapper';
import styles from './page.module.scss';
import Modeler from './modeler';
import { getProcess, getProcessVersionBpmn, getProcesses } from '@/lib/data/legacy/process';
import { toCaslResource } from '@/lib/ability/caslAbility';
import AddUserControls from '@/components/add-user-controls';

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
  const processes = await getProcesses(userId, ability);

  if (!ability.can('view', toCaslResource('Process', process))) {
    throw new Error('Forbidden.');
  }

  const selectedVersionBpmn = selectedVersionId
    ? await getProcessVersionBpmn(processId, selectedVersionId)
    : process.bpmn;
  const selectedVersion = selectedVersionId
    ? process.versions.find((version) => version.version === selectedVersionId)
    : undefined;

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
        />
      </Wrapper>
      <AddUserControls name={'modeler'} />
    </>
  );
};

export default Process;
