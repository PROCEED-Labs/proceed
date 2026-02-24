'use client';

import { Select, Space, Tooltip } from 'antd';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { spaceURL } from '@/lib/utils';
import { useEnvironment } from '@/components/auth-can';

type MachineDatasetVersionSelectorProps = {
  configId: string;
  machineDatasetId: string;
  machineDatasetName: string;
  currentVersion?: string;
  editMode: boolean;
  availableVersions: string[];
};

const MachineDatasetVersionSelector: React.FC<MachineDatasetVersionSelectorProps> = ({
  configId,
  machineDatasetId,
  machineDatasetName,
  currentVersion,
  editMode,
  availableVersions,
}) => {
  const router = useRouter();
  const environment = useEnvironment();
  const query = useSearchParams();

  // get the selected version from URL query params
  const selectedVersionFromUrl = query.get(`machineVersion_${machineDatasetId}`);

  const handleVersionChange = async (fullVersionNumber: string) => {
    try {
      const searchParams = new URLSearchParams(query);

      if (fullVersionNumber === 'latest') {
        // remove all param if latest is selected
        searchParams.delete(`machineVersion_${machineDatasetId}`);
        searchParams.delete('version');
        const keysToDelete: string[] = [];
        searchParams.forEach((value, key) => {
          if (key.startsWith('machineVersion_')) {
            keysToDelete.push(key);
          }
        });
        keysToDelete.forEach((key) => searchParams.delete(key));
      } else {
        // set the specific version
        searchParams.set(`machineVersion_${machineDatasetId}`, fullVersionNumber);
        // Auto-update main version if it's currently latest
        const currentMainVersion = searchParams.get('version');
        if (!currentMainVersion || currentMainVersion === 'latest') {
          // Extract major version from machine version
          const majorVersion = fullVersionNumber.split('.')[0];
          searchParams.set('version', majorVersion);
        }
      }
      router.push(
        spaceURL(
          environment,
          `/machine-config/${configId}${searchParams.size ? '?' + searchParams.toString() : ''}`,
        ),
      );
      router.refresh();
    } catch (error) {
      console.error('Error loading machine dataset version:', error);
    }
  };
  // just show in view mode
  if (editMode) {
    return null;
  }

  // show only if versions exist
  if (availableVersions.length === 0) {
    return null;
  }
  // value of version to show as selected
  const mainVersionFromUrl = query.get('version');

  let displayedValue: string;

  if (selectedVersionFromUrl) {
    // if there's a machine version in URL, use it
    displayedValue = selectedVersionFromUrl;
  } else if (mainVersionFromUrl && mainVersionFromUrl !== 'latest') {
    // if main version is selected but no machine version in URL then find the latest machine version under that parent version
    const versionsUnderParent = availableVersions.filter((version) => {
      const majorVersion = version.split('.')[0];
      return majorVersion === mainVersionFromUrl;
    });

    // use the first one in array already sorted descending, so it's the latest
    displayedValue = versionsUnderParent.length > 0 ? versionsUnderParent[0] : 'latest';
  } else {
    // if main version is latest
    displayedValue = 'latest';
  }

  // "Latest" option to available versions
  const versionsWithLatest = ['latest', ...availableVersions];

  // see if we have any versions
  const hasVersions = availableVersions.length > 0;

  return (
    <Tooltip title={`Version history for ${machineDatasetName}`}>
      <Select
        size="small"
        popupMatchSelectWidth={false}
        placeholder="Version"
        style={{
          minWidth: '120px',
          marginLeft: '12px',
        }}
        value={displayedValue}
        onChange={handleVersionChange}
        onClick={(e) => e.stopPropagation()}
        options={versionsWithLatest.map((version) => ({
          value: version,
          label:
            version === 'latest' ? (
              <span style={{ fontStyle: 'italic' }}>{'Latest'}</span>
            ) : (
              `v${version}`
            ),
        }))}
      />
    </Tooltip>
  );
};

export default MachineDatasetVersionSelector;
