// TODO: remove the use client if this page is used in server
'use client';

import { Button, Result, Select, Spin, Tooltip, Space, Dropdown, Typography } from 'antd';
import useDeployments from '../deployments-hook';
import Content from '@/components/content';
import BPMNCanvas, { BPMNCanvasRef } from '@/components/bpmn-canvas';
import { Toolbar, ToolbarGroup } from '@/components/toolbar';
import { PlusOutlined, InfoCircleOutlined, FilterOutlined } from '@ant-design/icons';
import { useRef, useState } from 'react';
import { DeployedProcessInfo, InstanceInfo, VersionInfo } from '@/lib/engines/deployment';
import contentStyles from './content.module.scss';
import styles from '@/app/(dashboard)/[environmentId]/processes/[processId]/modeler-toolbar.module.scss';
import InstanceInfoPanel from './instance-info-panel';
import { useSearchParamState } from '@/lib/use-search-param-state';
import { MdColorLens } from 'react-icons/md';
import { ColorOptions, applyColors, colorOptions } from './instance-coloring';
import { RemoveReadOnly } from '@/lib/typescript-utils';

function getVersionInstances(process: DeployedProcessInfo, version?: number) {
  const instances = process.instances.map((instance, idx) => {
    const name = `${idx + 1}. Instance: ${new Date(instance.globalStartTime).toLocaleString()}`;
    // @ts-ignore
    instance.label = name;

    return instance;
  }) as (InstanceInfo & { label: string })[];

  if (!version) return instances;
  return instances.filter((instance) => +instance.processVersion === version);
}

function getLatestVersion(process: DeployedProcessInfo) {
  let latest = process.versions.length - 1;
  for (let i = process.versions.length - 2; i >= 0; i--) {
    if (process.versions[i].version > process.versions[latest].version) latest = i;
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
  params: { processId },
}: {
  params: { processId: string };
}) {
  const { data: deployedProcesses, isLoading, isError } = useDeployments();
  const [selectedVersion, setSelectedVersion] = useState<VersionInfo | undefined>();
  const [selectedInstanceId, setSelectedInstanceId] = useSearchParamState('instance');
  const [selectedColoring, setSelectedColoring] = useState<ColorOptions>('processColors');

  const canvasRef = useRef<BPMNCanvasRef>(null);
  const [infoPanelOpen, setInfoPanelOpen] = useState(false);

  // TODO: better loading animation
  if (isLoading)
    return (
      <Content>
        <Spin />
      </Content>
    );

  if (isError)
    return (
      <Content>
        <Result status="500" title="Something went wrong" />
      </Content>
    );

  const selectedProcess = deployedProcesses?.find((process) => process.definitionId === processId);

  if (!selectedProcess)
    return (
      <Content>
        <Result status="404" title="Process not found" />
      </Content>
    );

  function onVersionChange(versionNumber: number) {
    const version = selectedProcess!.versions.find((v) => v.version === versionNumber);
    setSelectedVersion(version);

    const instances = getVersionInstances(selectedProcess!, version ? version.version : undefined);
    const youngestInstance = getYoungestInstance(instances);
    setSelectedInstanceId(youngestInstance?.processInstanceId);
  }

  const instances = getVersionInstances(selectedProcess, selectedVersion?.version);
  const selectedInstance = selectedInstanceId
    ? instances.find((i) => i.processInstanceId === selectedInstanceId)
    : undefined;

  let selectedBpmn;
  if (selectedInstance)
    selectedBpmn = selectedProcess.versions.find(
      (v) => v.version === +selectedInstance.processVersion,
    )!;
  else if (selectedVersion) selectedBpmn = selectedVersion;
  else selectedBpmn = getLatestVersion(selectedProcess);

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
                value={selectedInstanceId}
                onSelect={(value) => setSelectedInstanceId(value)}
                options={instances.map((instance) => ({
                  value: instance.processInstanceId,
                  label: instance.label,
                }))}
                placeholder="Select an instance"
              />
              <Tooltip title="Start new instance">
                {/** TODO: implement start new instance */}
                <Button icon={<PlusOutlined />} />
              </Tooltip>

              <Tooltip title="Filter by version">
                <Dropdown
                  menu={{
                    items: [
                      {
                        key: '-1',
                        label: selectedVersion ? (
                          <Typography.Text disabled>none</Typography.Text>
                        ) : (
                          'Select a version'
                        ),
                        disabled: !selectedVersion,
                      },

                      ...selectedProcess.versions.map((version) => ({
                        label: version.versionName || version.definitionName,
                        key: `${version.version}`,
                        disabled: false,
                      })),
                    ],
                    selectable: true,
                    onSelect: (item) => onVersionChange(+item.key),
                    selectedKeys: selectedVersion ? [`${selectedVersion.version}`] : [],
                  }}
                >
                  <Button icon={<FilterOutlined />}>
                    {selectedVersion
                      ? selectedVersion.versionName || selectedVersion.definitionName
                      : undefined}
                  </Button>
                </Dropdown>
              </Tooltip>

              <Tooltip title="TODO: color title">
                <Dropdown
                  menu={{
                    items: colorOptions as RemoveReadOnly<typeof colorOptions>,
                    selectable: true,
                    onSelect: (item) => {
                      if (!selectedInstance || !canvasRef.current) return;
                      applyColors(canvasRef.current, selectedInstance, item.key as ColorOptions);
                      setSelectedColoring(item.key as ColorOptions);
                    },
                    selectedKeys: [selectedColoring],
                  }}
                >
                  <Button icon={<MdColorLens />} />
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
                  instance={selectedInstance}
                  open={infoPanelOpen}
                  close={() => setInfoPanelOpen(false)}
                />
              </div>
            </Space>
          </Space>
        </Toolbar>

        <div style={{ zIndex: '100', height: '100%' }}>
          <BPMNCanvas bpmn={selectedBpmn} type="navigatedviewer" ref={canvasRef} />
        </div>
      </div>
    </Content>
  );
}
