import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Process } from '@/lib/data/process-schema';

function getProcessVersion(processVersions: Process['versions'], versionId: string | null) {
  if (versionId && processVersions.find((version) => version.id === versionId)) return versionId;
  else return processVersions[0]?.id;
}

/** Reacts to changes in the selected version of a process, but allows to change the state of the
 * version without affecting the query param */
export default function useProcessVersion(
  processVersions: Process['versions'],
  defaultVersion?: string,
) {
  const query = useSearchParams();

  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(() =>
    getProcessVersion(processVersions, defaultVersion ?? query.get('version')),
  );

  useEffect(() => {
    setSelectedVersionId(getProcessVersion(processVersions, query.get('version')));
  }, [query, processVersions]);

  return [selectedVersionId, setSelectedVersionId] as const;
}
