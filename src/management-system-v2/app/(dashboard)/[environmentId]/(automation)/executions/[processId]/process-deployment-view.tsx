// TODO: remove the use client if this page is used in server
'use client';

import { Button, Select, Tooltip, Space, Dropdown, Result } from 'antd';
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
import { useCallback, useMemo, useRef, useState } from 'react';
import contentStyles from './content.module.scss';
import toolbarStyles from '@/app/(dashboard)/[environmentId]/processes/[mode]/[processId]/modeler-toolbar.module.scss';
import styles from './process-deployment-view.module.scss';
import InstanceInfoPanel from './instance-info-panel';
import { useSearchParamState } from '@/lib/use-search-param-state';
import { MdOutlineColorLens } from 'react-icons/md';
import { ColorOptions, colorOptions } from './instance-coloring';
import { RemoveReadOnly } from '@/lib/typescript-utils';
import type { ElementLike } from 'diagram-js/lib/core/Types';
import { wrapServerCall } from '@/lib/wrap-server-call';
import useDeployment from '../deployment-hook';
import { getLatestDeployment, getVersionInstances, getYoungestInstance } from './instance-helpers';

import useColors from './use-colors';
import useTokens from './use-tokens';
import StartFormModal from './start-form-modal';
import useInstanceVariables from './use-instance-variables';
import { inlineScript, inlineUserTaskData } from '@proceed/user-task-helper';
import { StoredDeployment } from '@/lib/data/db/deployment';
import { useQuery } from '@tanstack/react-query';
import { getProcessBPMN } from '@/lib/data/processes';
import { useEnvironment } from '@/components/auth-can';
import { isUserErrorResponse, userError } from '@/lib/user-error';

export default function ProcessDeploymentView({
  processId,
  initialDeployments,
}: {
  processId: string;
  initialDeployments: StoredDeployment[];
}) {
  const { spaceId } = useEnvironment();

  const [selectedVersionId, setSelectedVersionId] = useState<string | undefined>();
  const [selectedInstanceId, setSelectedInstanceId] = useSearchParamState('instance');
  const [selectedColoring, setSelectedColoring] = useState<ColorOptions>('processColors');
  const [selectedElement, setSelectedElement] = useState<ElementLike | undefined>();

  const [startingInstance, setStartingInstance] = useState(false);
  const [resumingInstance, setResumingInstance] = useState(false);
  const [pausingInstance, setPausingInstance] = useState(false);
  const [stoppingInstance, setStoppingInstance] = useState(false);

  const [startForm, setStartForm] = useState('');

  const canvasRef = useRef<BPMNCanvasRef>(null);
  const [infoPanelOpen, setInfoPanelOpen] = useState(false);
  const {
    data: deployments,
    refetch,
    startInstance,
    resumeInstance,
    pauseInstance,
    stopInstance,
    getStartForm,
  } = useDeployment(processId, initialDeployments);

  const {
    selectedVersion,
    instances,
    selectedInstance,
    currentVersion,
    instanceIsRunning,
    instanceIsPausing,
    instanceIsPaused,
  } = useMemo(() => {
    let selectedVersion, instances, selectedInstance, currentVersion;
    let instanceIsRunning = false;
    let instanceIsPausing = false;
    let instanceIsPaused = false;

    const activeStates = ['PAUSED', 'RUNNING', 'READY', 'DEPLOYMENT-WAITING', 'WAITING'];

    if (deployments?.length) {
      selectedVersion = deployments.find((v) => v.version.id === selectedVersionId)?.version;

      instances = getVersionInstances(deployments, selectedVersionId);
      selectedInstance = selectedInstanceId
        ? instances.find((i) => i.processInstanceId === selectedInstanceId)
        : undefined;

      let currentVersionId = getLatestDeployment(deployments)!.version.id;
      if (selectedInstance) {
        currentVersionId = selectedInstance.processVersion;
        instanceIsRunning = selectedInstance.instanceState.some((state) =>
          activeStates.includes(state),
        );
        instanceIsPausing = selectedInstance.instanceState.some((state) => state === 'PAUSING');
        instanceIsPaused = selectedInstance.instanceState.some((state) => state === 'PAUSED');
      } else if (selectedVersionId) {
        currentVersionId = selectedVersionId;
      }
      currentVersion = deployments.find(
        (version) => version.version.id === currentVersionId,
      )!.version;
    }

    return {
      selectedVersion,
      instances,
      selectedInstance,
      currentVersion,
      instanceIsRunning,
      instanceIsPausing,
      instanceIsPaused,
    };
  }, [deployments, selectedVersionId, selectedInstanceId]);

  const { data: selectedBpmn } = useQuery({
    queryFn: async () => {
      const bpmn = await getProcessBPMN(processId, spaceId, currentVersion?.id);
      if (isUserErrorResponse(bpmn)) return { bpmn: '' };
      return { bpmn };
    },
    queryKey: ['space', spaceId, 'process', processId, 'version', currentVersion?.id, 'bpmn'],
  });

  const { variableDefinitions, variables } = useInstanceVariables({
    version: selectedBpmn,
  });

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

  if (!deployments?.length) {
    return (
      <Content>
        <Result status="404" title="Process data is not available anymore" />
      </Content>
    );
  }

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
                variant="borderless"
                onSelect={(value) => setSelectedInstanceId(value)}
                options={instances?.map((instance, idx) => ({
                  value: instance.processInstanceId,
                  label: `${idx + 1}. Instance: ${new Date(instance.globalStartTime).toLocaleString()}`,
                }))}
                placeholder="Select an instance"
              />
              <Tooltip title="Start new instance">
                <Button
                  icon={<PlusOutlined />}
                  loading={startingInstance}
                  onClick={async () => {
                    setStartingInstance(true);
                    await wrapServerCall({
                      fn: async () => {
                        const latestDeployment = getLatestDeployment(deployments);
                        if (!latestDeployment) {
                          return userError(
                            'The current process does not seem to be deployed anymore.',
                          );
                        }

                        const { versionId } = latestDeployment;

                        let startForm = await getStartForm(versionId);

                        if (typeof startForm !== 'string') return startForm;

                        if (startForm) {
                          const mappedVariables = Object.fromEntries(
                            variables
                              .filter((variable) => variable.value !== undefined)
                              .map((variable) => [variable.name, variable.value]),
                          );
                          startForm = inlineScript(startForm, '', '', variableDefinitions);
                          startForm = inlineUserTaskData(startForm, mappedVariables, []);

                          setStartForm(startForm);
                        } else {
                          return startInstance(versionId);
                        }
                      },
                      onSuccess: async (instanceId) => {
                        await refetch();
                        setSelectedInstanceId(instanceId);
                      },
                    });
                    setStartingInstance(false);
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
                      ...deployments.map((d) => ({
                        label: d.version.name || d.processId,
                        key: `${d.version.id}`,
                        disabled: false,
                      })),
                    ],
                    selectable: true,
                    onSelect: ({ key }) => {
                      const versionId = key === '-2' ? undefined : key;
                      setSelectedVersionId(versionId);

                      const instances = getVersionInstances(deployments, versionId);
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
                      ? selectedVersion.name || selectedVersion.processId
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
                <Tooltip
                  title={instanceIsPausing ? 'Abort pausing the instance' : 'Resume the instance'}
                >
                  <Button
                    className={styles.PlayIcon}
                    icon={<CaretRightOutlined />}
                    loading={resumingInstance}
                    disabled={!instanceIsPausing && !instanceIsPaused}
                    onClick={async () => {
                      setResumingInstance(true);
                      await wrapServerCall({
                        fn: () => resumeInstance(selectedInstance.processInstanceId),
                        onSuccess: async () => await refetch(),
                      });
                      setResumingInstance(false);
                    }}
                  />
                </Tooltip>

                <Tooltip title="Pause the instance">
                  <Button
                    className={styles.PauseIcon}
                    icon={<PauseOutlined />}
                    loading={pausingInstance || instanceIsPausing}
                    disabled={!instanceIsRunning || instanceIsPausing || instanceIsPaused}
                    onClick={async () => {
                      setPausingInstance(true);
                      await wrapServerCall({
                        fn: async () => pauseInstance(selectedInstance.processInstanceId),
                        onSuccess: async () => await refetch(),
                      });
                      setPausingInstance(false);
                    }}
                  />
                </Tooltip>

                <Tooltip title="Stop the instance">
                  <Button
                    className={styles.StopIcon}
                    icon={<StopOutlined />}
                    loading={stoppingInstance}
                    disabled={!instanceIsRunning}
                    onClick={async () => {
                      setStoppingInstance(true);
                      await wrapServerCall({
                        fn: async () => stopInstance(selectedInstance.processInstanceId),
                        onSuccess: async () => await refetch(),
                      });
                      setStoppingInstance(false);
                    }}
                  />
                </Tooltip>
              </ToolbarGroup>
            )}

            <Space style={{ alignItems: 'start' }}>
              <ToolbarGroup>
                <Tooltip title={infoPanelOpen ? 'Close Info Panel' : 'Open Info Panel'}>
                  <Button
                    icon={<InfoCircleOutlined />}
                    onClick={() => setInfoPanelOpen((prev) => !prev)}
                  />
                </Tooltip>
              </ToolbarGroup>

              {selectedBpmn && (
                <div style={{ height: '0' }}>
                  <InstanceInfoPanel
                    processId={processId}
                    version={selectedBpmn}
                    instance={selectedInstance}
                    element={selectedElement}
                    open={infoPanelOpen}
                    close={() => setInfoPanelOpen(false)}
                    refetch={refetch}
                  />
                </div>
              )}
            </Space>
          </Space>
        </Toolbar>

        <StartFormModal
          html={startForm}
          onSubmit={async (submitVariables) => {
            const deployment = getLatestDeployment(deployments);

            if (!deployment) {
              throw new Error('The current process does not seem to be deployed anymore.');
            }

            const mappedVariables: Record<string, { value: any }> = {};

            // set the values of variables to the ones coming from the start form
            Object.entries(submitVariables).forEach(
              ([key, value]) => (mappedVariables[key] = { value }),
            );

            // start the instance with the initial variable values from the start form
            await wrapServerCall({
              fn: () => startInstance(deployment.version.id, mappedVariables),

              onSuccess: async (instanceId) => {
                await refetch();
                setSelectedInstanceId(instanceId);
                setStartForm('');
              },
            });
          }}
          onCancel={() => setStartForm('')}
        />

        {selectedBpmn && (
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
        )}
      </div>
    </Content>
  );
}
