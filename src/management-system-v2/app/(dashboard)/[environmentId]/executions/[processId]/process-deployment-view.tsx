// TODO: remove the use client if this page is used in server
'use client';

import { Button, Select, Tooltip, Space, Dropdown, Result, Skeleton } from 'antd';
import Content from '@/components/content';
import BPMNCanvas, { BPMNCanvasRef } from '@/components/bpmn-canvas';
import { Toolbar, ToolbarGroup } from '@/components/toolbar';
import {
  PlusOutlined,
  InfoCircleOutlined,
  FilterOutlined,
  CaretRightOutlined,
  PauseOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { Suspense, useCallback, useMemo, useRef, useState } from 'react';
import contentStyles from './content.module.scss';
import toolbarStyles from '@/app/(dashboard)/[environmentId]/processes/[processId]/modeler-toolbar.module.scss';
import InstanceInfoPanel from './instance-info-panel';
import { useSearchParamState } from '@/lib/use-search-param-state';
import { MdOutlineColorLens } from 'react-icons/md';
import { ColorOptions, colorOptions } from './instance-coloring';
import { RemoveReadOnly } from '@/lib/typescript-utils';
import type { ElementLike } from 'diagram-js/lib/core/Types';
import {
  pauseInstance,
  resumeInstance,
  startInstance,
  stopInstance,
} from '@/lib/engines/server-actions';
import { useEnvironment } from '@/components/auth-can';
import { wrapServerCall } from '@/lib/wrap-server-call';
import useDeployment from '../deployment-hook';
import { getLatestDeployment, getVersionInstances, getYoungestInstance } from './instance-helpers';

import useColors from './use-colors';
import useTokens from './use-tokens';
import { DeployedProcessInfo } from '@/lib/engines/deployment';

import styles from './process-deployment-view.module.scss';

function PageContent({
  selectedProcess,
  refetch,
}: {
  selectedProcess: DeployedProcessInfo;
  refetch: () => Promise<any>;
}) {
  const [selectedVersionId, setSelectedVersionId] = useState<string | undefined>();
  const [selectedInstanceId, setSelectedInstanceId] = useSearchParamState('instance');
  const [selectedColoring, setSelectedColoring] = useState<ColorOptions>('processColors');
  const [selectedElement, setSelectedElement] = useState<ElementLike | undefined>();

  const canvasRef = useRef<BPMNCanvasRef>(null);
  const [infoPanelOpen, setInfoPanelOpen] = useState(false);

  const { spaceId } = useEnvironment();

  const { selectedVersion, instances, selectedInstance, currentVersion } = useMemo(() => {
    const selectedVersion = selectedProcess.versions.find((v) => v.versionId === selectedVersionId);

    const instances = getVersionInstances(selectedProcess, selectedVersionId);
    const selectedInstance = selectedInstanceId
      ? instances.find((i) => i.processInstanceId === selectedInstanceId)
      : undefined;

    let currentVersionId = getLatestDeployment(selectedProcess).versionId;
    if (selectedInstance) {
      currentVersionId = selectedInstance.processVersion;
    } else if (selectedVersionId) {
      currentVersionId = selectedVersionId;
    }
    const currentVersion = selectedProcess.versions.find(
      (version) => version.versionId === currentVersionId,
    );

    return { selectedVersion, instances, selectedInstance, currentVersion };
  }, [selectedProcess, selectedVersionId, selectedInstanceId]);

  const selectedBpmn = useMemo(() => {
    return { bpmn: currentVersion?.bpmn || '' };
  }, [currentVersion]);

  const { refreshTokens } = useTokens(selectedInstance || null, canvasRef);
  const { refreshColoring } = useColors(
    selectedBpmn,
    selectedColoring,
    selectedInstance,
    canvasRef,
  );
  const refreshVisuals = useCallback(() => {
    refreshTokens();
    refreshColoring();
  }, [refreshTokens, refreshColoring]);

  return (
    <Content compact wrapperClass={contentStyles.Content}>
      <div
        style={{
          height: '100%',
        }}
      >
        <Toolbar className={toolbarStyles.Toolbar}>
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
                onSelect={(value) => setSelectedInstanceId(value)}
                options={instances?.map((instance, idx) => ({
                  value: instance.processInstanceId,
                  label: `${idx + 1}. Instance: ${new Date(instance.globalStartTime).toLocaleString()}`,
                }))}
                placeholder="Select an instance"
              />
              <Tooltip title="Start new instance">
                {/** TODO: implement start new instance */}
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
                      onSuccess: async (instanceId) => {
                        await refetch();
                        setSelectedInstanceId(instanceId);
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
                    onSelect: ({ key }) => {
                      const versionId = key === '-2' ? undefined : key;
                      setSelectedVersionId(versionId);

                      const instances = getVersionInstances(selectedProcess, versionId);
                      if (!instances.some((i) => i.processInstanceId === selectedInstanceId)) {
                        const youngestInstance = getYoungestInstance(instances);
                        setSelectedInstanceId(youngestInstance?.processInstanceId);
                      }
                    },
                    selectedKeys: selectedVersionId ? [selectedVersionId] : [],
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
                    },
                    selectedKeys: [selectedColoring],
                  }}
                >
                  <Button icon={<MdOutlineColorLens size={18} />} />
                </Dropdown>
              </Tooltip>
            </ToolbarGroup>

            {selectedInstance && (
              <ToolbarGroup>
                <Button
                  icon={<CaretRightOutlined className={styles.PlayIcon} />}
                  onClick={() => {
                    wrapServerCall({
                      fn: () =>
                        resumeInstance(
                          selectedProcess.definitionId,
                          selectedInstance.processInstanceId,
                          spaceId,
                        ),
                      onSuccess: async () => {
                        await refetch();
                      },
                    });
                  }}
                />
                <Button
                  icon={<PauseOutlined className={styles.PauseIcon} />}
                  onClick={() => {
                    wrapServerCall({
                      fn: () =>
                        pauseInstance(
                          selectedProcess.definitionId,
                          selectedInstance.processInstanceId,
                          spaceId,
                        ),
                      onSuccess: async () => {
                        await refetch();
                      },
                    });
                  }}
                />
                <Button
                  icon={<StopOutlined className={styles.StopIcon} />}
                  onClick={() => {
                    wrapServerCall({
                      fn: () =>
                        stopInstance(
                          selectedProcess.definitionId,
                          selectedInstance.processInstanceId,
                          spaceId,
                        ),
                      onSuccess: async () => {
                        await refetch();
                      },
                    });
                  }}
                />
              </ToolbarGroup>
            )}

            <Space style={{ alignItems: 'start' }}>
              <ToolbarGroup>
                <Tooltip title="Open Info Panel">
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
            onRootChange={refreshVisuals}
          />
        </div>
      </div>
    </Content>
  );
}

function SuspenseWrapper({ processId }: { processId: string }) {
  const { data, refetch } = useDeployment(processId);

  return (
    <>
      {data ? (
        <PageContent selectedProcess={data} refetch={refetch} />
      ) : (
        <Content>
          <Result status="404" title="Process not found" />
        </Content>
      )}
    </>
  );
}

export default function ProcessDeploymentView({ processId }: { processId: string }) {
  return (
    <Suspense
      fallback={
        <Content>
          <Skeleton />
        </Content>
      }
    >
      <SuspenseWrapper processId={processId} />
    </Suspense>
  );
}
