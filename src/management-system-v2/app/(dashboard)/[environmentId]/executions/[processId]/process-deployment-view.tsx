// TODO: remove the use client if this page is used in server
'use client';

import { Button, Select, Tooltip, Space, Dropdown } from 'antd';
import Content from '@/components/content';
import BPMNCanvas, { BPMNCanvasRef } from '@/components/bpmn-canvas';
import { Toolbar, ToolbarGroup } from '@/components/toolbar';
import { PlusOutlined, InfoCircleOutlined, FilterOutlined } from '@ant-design/icons';
import { useCallback, useRef, useState } from 'react';
import { DeployedProcessInfo, InstanceInfo, VersionInfo } from '@/lib/engines/deployment';
import contentStyles from './content.module.scss';
import styles from '@/app/(dashboard)/[environmentId]/processes/[processId]/modeler-toolbar.module.scss';
import InstanceInfoPanel from './instance-info-panel';
import { useSearchParamState } from '@/lib/use-search-param-state';
import { MdOutlineColorLens } from 'react-icons/md';
import { ColorOptions, applyColors, colorOptions, flushPreviousStyling } from './instance-coloring';
import { RemoveReadOnly } from '@/lib/typescript-utils';
import type { ElementLike } from 'diagram-js/lib/core/Types';
import { startInstance } from '@/lib/engines/server-actions';
import { useEnvironment } from '@/components/auth-can';
import { useRouter } from 'next/navigation';
import { wrapServerCall } from '@/lib/wrap-server-call';

function getVersionInstances(process: DeployedProcessInfo, versionId?: string) {
  const instances = process.instances.map((instance, idx) => {
    const name = `${idx + 1}. Instance: ${new Date(instance.globalStartTime).toLocaleString()}`;
    // @ts-ignore
    instance.label = name;

    return instance;
  }) as (InstanceInfo & { label: string })[];

  if (!versionId) return instances;
  return instances.filter((instance) => instance.processVersion === versionId);
}

function getLatestDeployment(process: DeployedProcessInfo) {
  let latest = process.versions.length - 1;
  for (let i = process.versions.length - 2; i >= 0; i--) {
    if (process.versions[i].deploymentDate > process.versions[latest].deploymentDate) latest = i;
  }

  return process.versions[latest];
}

function getYoungestInstance<T extends InstanceInfo[]>(instances: T) {
  if (instances.length === 0) return undefined;

  let firstInstance = 0;
  for (let i = 0; i < instances.length; i++) {
    if (instances[i].globalStartTime < instances[firstInstance].globalStartTime) firstInstance = i;
  }
  return instances[firstInstance];
}

export default function ProcessDeploymentView({
  selectedProcess,
}: {
  selectedProcess: DeployedProcessInfo;
}) {
  const [selectedVersion, setSelectedVersion] = useState<VersionInfo | undefined>();
  const [selectedInstanceId, setSelectedInstanceId] = useSearchParamState('instance');
  const [selectedColoring, setSelectedColoring] = useState<ColorOptions>('processColors');
  const [selectedElement, setSelectedElement] = useState<ElementLike | undefined>();

  const canvasRef = useRef<BPMNCanvasRef>(null);
  const [infoPanelOpen, setInfoPanelOpen] = useState(false);

  const { spaceId } = useEnvironment();

  const router = useRouter();

  function selectNewBpmn(type: 'version' | 'instance', identifier: number | string) {
    if (type == 'instance') {
      setSelectedInstanceId(identifier as string);
    } else if (type == 'version') {
      const version = selectedProcess!.versions.find((v) => v.versionId === identifier);
      setSelectedVersion(version);

      const instances = getVersionInstances(
        selectedProcess!,
        version ? version.versionId : undefined,
      );
      const youngestInstance = getYoungestInstance(instances);
      setSelectedInstanceId(youngestInstance?.processInstanceId);
    }

    // This is necessary, because bpmn-js throws an error if you try to remove a marker
    // from an element that doesn't exist
    flushPreviousStyling();
  }

  const instances = getVersionInstances(selectedProcess, selectedVersion?.versionId);
  const selectedInstance = selectedInstanceId
    ? instances.find((i) => i.processInstanceId === selectedInstanceId)
    : undefined;

  let selectedBpmn;
  if (selectedInstance)
    selectedBpmn = selectedProcess.versions.find(
      (v) => v.versionId === selectedInstance.processVersion,
    )!;
  else if (selectedVersion) selectedBpmn = selectedVersion;
  else selectedBpmn = getLatestDeployment(selectedProcess);

  // When selected coloring changes, this function will change
  // That in turn will trigger the useEffect inside the BPMNCanvas
  // If a new instance is selected, the same useEffect will be triggered,
  // only this time because of the bpmn change
  // NOTE: selectedColoring is not part of the dependencies to avoid re-rendering
  // the component on a case where it isn't necessary
  const applyColoring = useCallback(
    (coloring?: ColorOptions | ElementLike) => {
      if (!selectedInstance || !canvasRef.current) return;
      applyColors(
        canvasRef.current,
        selectedInstance,
        typeof coloring === 'string' ? coloring : selectedColoring,
      );
    },
    [selectedInstance, canvasRef],
  );

  return (
    <Content compact wrapperClass={contentStyles.Content}>
      <div
        style={{
          height: '100%',
        }}
      >
        <Toolbar className={styles.Toolbar}>
          <Space
            aria-label="general-modeler-toolbar"
            style={{
              width: '100%',
              justifyContent: 'space-between',
              flexWrap: 'nowrap',
              alignItems: 'start',
            }}
          >
            <ToolbarGroup>
              <Select
                value={
                  selectedInstanceId && selectedInstance
                    ? selectedInstance.processInstanceId
                    : undefined
                }
                onSelect={(value) => selectNewBpmn('instance', value)}
                options={instances.map((instance) => ({
                  value: instance.processInstanceId,
                  label: instance.label,
                }))}
                placeholder="Select an instance"
              />
              <Tooltip title="Start new instance">
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => {
                    wrapServerCall({
                      fn: () =>
                        startInstance(
                          selectedProcess.definitionId,
                          getLatestDeployment(selectedProcess).versionId,
                          spaceId,
                        ),
                      onSuccess: (instanceId) => {
                        selectNewBpmn('instance', instanceId);
                        router.refresh();
                      },
                    });
                  }}
                />
              </Tooltip>

              <Tooltip title="Filter by version">
                <Dropdown
                  menu={{
                    items: [
                      {
                        key: '-1',
                        label: 'Select a version',
                        disabled: true,
                      },
                      ...(selectedVersion
                        ? [
                            {
                              label: '<none>',
                              key: '-2',
                            },
                          ]
                        : []),
                      ...selectedProcess.versions.map((version) => ({
                        label: version.versionName || version.definitionName,
                        key: `${version.versionId}`,
                        disabled: false,
                      })),
                    ],
                    selectable: true,
                    onSelect: (item) => selectNewBpmn('version', item.key),
                    selectedKeys: selectedVersion ? [`${selectedVersion.versionId}`] : [],
                  }}
                >
                  <Button icon={<FilterOutlined />}>
                    {selectedVersion
                      ? selectedVersion.versionName || selectedVersion.definitionName
                      : undefined}
                  </Button>
                </Dropdown>
              </Tooltip>

              <Tooltip title="Coloring">
                <Dropdown
                  menu={{
                    items: colorOptions as RemoveReadOnly<typeof colorOptions>,
                    selectable: true,
                    onSelect: (item) => {
                      setSelectedColoring(item.key as ColorOptions);
                      applyColoring(item.key as ColorOptions);
                    },
                    selectedKeys: [selectedColoring],
                  }}
                >
                  <Button icon={<MdOutlineColorLens size={18} />} />
                </Dropdown>
              </Tooltip>
            </ToolbarGroup>

            <Space style={{ alignItems: 'start' }}>
              <ToolbarGroup>
                <Tooltip title="Start new instance">
                  <Button
                    icon={<InfoCircleOutlined />}
                    onClick={() => setInfoPanelOpen((prev) => !prev)}
                  />
                </Tooltip>
              </ToolbarGroup>

              <div style={{ height: '0' }}>
                <InstanceInfoPanel
                  info={{
                    instance: selectedInstance,
                    element: selectedElement!,
                    process: selectedProcess,
                    version: selectedVersion!,
                  }}
                  open={infoPanelOpen}
                  close={() => setInfoPanelOpen(false)}
                />
              </div>
            </Space>
          </Space>
        </Toolbar>

        <div style={{ zIndex: '100', height: '100%' }}>
          <BPMNCanvas
            bpmn={selectedBpmn}
            type="navigatedviewer"
            ref={canvasRef}
            onSelectionChange={(_, newSelection) => {
              const element = newSelection.at(-1);

              if (
                element?.type === 'bpmn:Process' ||
                element?.id.includes('_plane') ||
                element?.type === 'bpmn:SequenceFlow'
              )
                return;

              setSelectedElement(element ?? canvasRef.current?.getCurrentRoot());
              setInfoPanelOpen(true);
            }}
            onRootChange={applyColoring}
          />
        </div>
      </div>
    </Content>
  );
}
