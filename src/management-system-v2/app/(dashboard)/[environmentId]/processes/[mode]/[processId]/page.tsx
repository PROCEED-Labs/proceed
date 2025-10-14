import { getCurrentEnvironment } from '@/components/auth';
import Wrapper from './wrapper';
import styles from './page.module.scss';
import Modeler from './modeler';
import { toCaslResource } from '@/lib/ability/caslAbility';
import AddUserControls from '@/components/add-user-controls';
import { getProcess, getProcesses } from '@/lib/data/db/process';
import { getRolesWithMembers } from '@/lib/data/db/iam/roles';
import { getProcessBPMN } from '@/lib/data/processes';
import BPMNTimeline from '@/components/bpmn-timeline';
import { UnauthorizedError } from '@/lib/ability/abilityHelper';
import { RoleType, UserType } from './use-potentialOwner-store';
import type { Process } from '@/lib/data/process-schema';
import { redirect } from 'next/navigation';
import { spaceURL } from '@/lib/utils';

type ProcessPageProps = {
  params: { processId: string; environmentId: string; mode: string };
  searchParams: { version?: string };
};

type ProcessComponentProps = ProcessPageProps & {
  isListView?: boolean;
};

const ProcessComponent = async ({
  params: { processId, environmentId },
  searchParams,
  isListView,
}: ProcessComponentProps) => {
  // TODO: check if params is correct after fix release. And maybe don't need
  // refresh in processes.tsx anymore?
  //console.log('processId', processId);
  //console.log('query', searchParams);
  const { ability, activeEnvironment } = await getCurrentEnvironment(environmentId);

  const selectedVersionId = searchParams.version;
  // Only load BPMN if no version selected (for latest version)
  const process = await getProcess(processId, !selectedVersionId);

  // For list view: check for redirect
  if (isListView) {
    // If no version specified but released versions exist, redirect to last released version
    if (!searchParams.version && process.versions.length > 0) {
      const lastVersionId = process.versions[process.versions.length - 1].id;
      const currentPath = `/processes/list/${processId}`;
      const redirectUrl = spaceURL(activeEnvironment, `${currentPath}?version=${lastVersionId}`);
      redirect(redirectUrl);
    }
  }
  const processes = await getProcesses(activeEnvironment.spaceId, ability, false);

  // const rawRoles = activeEnvironment.isOrganization
  //   ? await getRolesWithMembers(activeEnvironment.spaceId, ability)
  //   : [];

  // const roles = rawRoles.reduce((acc, role) => ({ ...acc, [role.id]: role.name }), {} as RoleType);
  // const user = rawRoles.reduce((acc, role) => {
  //   role.members.forEach((member) => {
  //     acc[member.id] = {
  //       userName: member.username,
  //       name: member.firstName + ' ' + member.lastName,
  //     };
  //   });

  //   return acc;
  // }, {} as UserType);

  if (!ability.can('view', toCaslResource('Process', process))) {
    throw new UnauthorizedError();
  }

  const selectedVersionBpmn = selectedVersionId
    ? await getProcessBPMN(processId, environmentId, selectedVersionId)
    : process.bpmn;
  const selectedVersion = selectedVersionId
    ? process.versions.find((version) => version.id === selectedVersionId)
    : undefined;

  // Since the user is able to minimize and close the page, everything is in a
  // client component from here.
  return (
    <>
      <Wrapper
        processName={process.name}
        processes={processes}
        // potentialOwner={{
        //   roles,
        //   user,
        // }}
        modelerComponent={
          <Modeler
            className={styles.Modeler}
            process={{ ...process, bpmn: selectedVersionBpmn as string } as Process}
            versionName={selectedVersion?.name}
          />
        }
        timelineComponent={
          <BPMNTimeline
            className={styles.Modeler}
            process={{ ...process, bpmn: selectedVersionBpmn as string } as Process}
          />
        }
      />
      <AddUserControls name={'modeler'} />
    </>
  );
};

const Process = async (props: ProcessPageProps) => {
  const isListView = props.params.mode === 'list';
  return <ProcessComponent {...props} isListView={isListView} />;
};

export default Process;
export { ProcessComponent };
