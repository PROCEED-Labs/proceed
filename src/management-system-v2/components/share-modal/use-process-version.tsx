import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Process } from '@/lib/data/process-schema';

function getProcessVersion(
  allowLatest: boolean,
  processVersions?: Process['versions'],
  versionId?: string | null,
) {
  if (!processVersions) return null;
  else if (versionId && processVersions.find((version) => version.id === versionId))
    return versionId;
  else if (allowLatest) return null;
  else return processVersions[0]?.id;
}

/** Reacts to changes in the selected version of a process, but allows to change the state of the
 * version without affecting the query param */
export default function useProcessVersion(
  processVersions?: Process['versions'],
  defaultVersion?: string,
  allowLatest = true,
) {
  const query = useSearchParams();

  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(() =>
    getProcessVersion(allowLatest, processVersions, defaultVersion ?? query.get('version')),
  );

  useEffect(() => {
    let newVersion = query.get('version');
    if (newVersion === null && !allowLatest) return;

    setSelectedVersionId(getProcessVersion(allowLatest, processVersions, newVersion));
  }, [query, processVersions, allowLatest]);

  return [selectedVersionId, setSelectedVersionId] as const;
}
