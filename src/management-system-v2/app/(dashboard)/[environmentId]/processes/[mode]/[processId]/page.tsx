import { getCurrentEnvironment } from '@/components/auth';
import Wrapper from './wrapper';
import styles from './page.module.scss';
import Modeler from './modeler';
import { toCaslResource } from '@/lib/ability/caslAbility';
import AddUserControls from '@/components/add-user-controls';
import { getProcess, getProcesses } from '@/lib/data/db/process';
import { getProcessBPMN } from '@/lib/data/processes';
import BPMNTimeline from '@/components/bpmn-timeline';
import { UnauthorizedError } from '@/lib/ability/abilityHelper';
import type { Process } from '@/lib/data/process-schema';
import { redirect } from 'next/navigation';
import { spaceURL } from '@/lib/utils';
import { errorResponse } from '@/lib/server-error-handling/page-error-response';
import { isUserErrorResponse } from '@/lib/server-error-handling/user-error';
import { err } from 'neverthrow';
import { getFolderById } from '@/lib/data/db/folders';

type ProcessPageProps = {
  params: Promise<{ processId: string; environmentId: string; mode: string }>;
  searchParams: Promise<{ version?: string }>;
};

type ProcessComponentProps = ProcessPageProps & {
  isListView?: boolean;
};

const ProcessComponent = async (props: ProcessComponentProps) => {
  const searchParams = await props.searchParams;
  const params = await props.params;

  const { processId, environmentId } = params;

  // TODO: check if params is correct after fix release. And maybe don't need
  // refresh in processes.tsx anymore?

  //console.log('processId', processId);
  //console.log('query', searchParams);
  const currentSpace = await getCurrentEnvironment(environmentId);
  if (currentSpace.isErr()) {
    return errorResponse(currentSpace);
  }
  const { ability, activeEnvironment } = currentSpace.value;

  const selectedVersionId = searchParams.version;
  // Only load BPMN if no version selected (for latest version)
  const process = await getProcess(processId, !selectedVersionId);
  if (process.isErr()) {
    return errorResponse(process);
  }

  // For list view: check for redirect
  if (props.isListView) {
    // If no version specified but released versions exist, redirect to last released version
    if (!searchParams.version && process.value.versions.length > 0) {
      const lastVersionId = process.value.versions[process.value.versions.length - 1].id;
      const currentPath = `/processes/list/${processId}`;
      const redirectUrl = spaceURL(activeEnvironment, `${currentPath}?version=${lastVersionId}`);
      redirect(redirectUrl);
    }
  }
  const processes = await getProcesses(activeEnvironment.spaceId, ability, false);
  const folder = await getFolderById(process.value.folderId, ability);
  if (folder.isErr()) return errorResponse(folder);

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

  if (!ability.can('view', toCaslResource('Process', process.value))) {
    throw new UnauthorizedError();
  }

  let selectedVersionBpmn;
  if (selectedVersionId) {
    const bpmn = await getProcessBPMN(processId, environmentId, selectedVersionId);
    // TODO: don't use server action
    if (isUserErrorResponse(bpmn)) {
      return errorResponse(err());
    }

    selectedVersionBpmn = bpmn;
  } else {
    selectedVersionBpmn = process.value.bpmn;
  }

  const selectedVersion = selectedVersionId
    ? process.value.versions.find((version) => version.id === selectedVersionId)
    : undefined;

  // Since the user is able to minimize and close the page, everything is in a
  // client component from here.
  return (
    <>
      <Wrapper
        processName={process.value.name}
        processes={processes.value}
        // potentialOwner={{
        //   roles,
        //   user,
        // }}
        modelerComponent={
          <Modeler
            className={styles.Modeler}
            process={{ ...process.value, bpmn: selectedVersionBpmn as string } as Process}
            folder={folder.value}
            versionName={selectedVersion?.name}
          />
        }
        timelineComponent={
          <BPMNTimeline
            className={styles.Modeler}
            process={{ ...process.value, bpmn: selectedVersionBpmn as string } as Process}
          />
        }
      />
      <AddUserControls name={'modeler'} />
    </>
  );
};

const Process = async (props: ProcessPageProps) => {
  const params = await props.params;
  const isListView = params.mode === 'list';
  return <ProcessComponent {...props} isListView={isListView} />;
};

export default Process;
