import Auth, { getCurrentUser } from '@/components/auth';
import Wrapper from './wrapper';
import styles from './page.module.scss';
import { FC, useEffect, useState } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import Modeler from '@/components/modeler';
import cn from 'classnames';
import { getProcess, getProcessVersionBpmn, getProcesses } from '@/lib/data/legacy/process';
import { toCaslResource } from '@/lib/ability/caslAbility';

type ProcessProps = {
  params: { processId: string };
  searchParams: { version?: string };
};

const Process = async ({ params: { processId }, searchParams }: ProcessProps) => {
  // TODO: check if params is correct after fix release. And maybe don't need
  // refresh in processes.tsx anymore?
  //console.log('processId', processId);
  //console.log('query', searchParams);
  const selectedVersionId = searchParams.version ? searchParams.version : undefined;
  const { ability } = await getCurrentUser();
  // Only load bpmn if no version selected.
  const process = await getProcess(processId, !selectedVersionId);
  const processes = await getProcesses(ability);

  if (!ability.can('view', toCaslResource('Process', process))) {
    throw new Error('Forbidden.');
  }

  const selectedVersionBpmn = selectedVersionId
    ? await getProcessVersionBpmn(processId, selectedVersionId)
    : process.bpmn;
  const selectedVersion = selectedVersionId
    ? process.versions.find((version) => String(version.version) === selectedVersionId)
    : undefined;

  // Since the user is able to minimize and close the page, everyting is in a
  // client component from here.
  return (
    <Wrapper processName={process.definitionName} versions={process.versions} processes={processes}>
      <Modeler
        className={styles.Modeler}
        processBpmn={selectedVersionBpmn}
        process={process}
        versionName={selectedVersion?.name}
      />
    </Wrapper>
  );
};

export default Auth(
  {
    action: 'view',
    resource: 'Process',
    fallbackRedirect: '/processes',
  },
  Process,
);
