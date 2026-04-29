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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import contentStyles from './content.module.scss';
import toolbarStyles from '@/app/(dashboard)/[environmentId]/processes/[mode]/[processId]/modeler-toolbar.module.scss';
import styles from './process-deployment-view.module.scss';
import InstanceInfoPanel from './instance-info-panel';
import { useSearchParamState } from '@/lib/use-search-param-state';
import { MdOutlineColorLens, MdOutlineSync, MdOutlineSyncDisabled } from 'react-icons/md';
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
import { toBpmnObject, getElementsByTagName } from '@proceed/bpmn-helper';
import {
  changeDeploymentActivation,
  getGlobalVariablesForHTML,
} from '@/lib/engines/server-actions';
import { useSession } from 'next-auth/react';

export default function ProcessDeploymentView({
  processId,
  initialDeployments,
}: {
  processId: string;
  initialDeployments: StoredDeployment[];
}) {
  const { data: session } = useSession();
  const { spaceId } = useEnvironment();

  const [selectedVersionId, setSelectedVersionId] = useState<string | undefined>();
  const [selectedInstanceId, setSelectedInstanceId] = useSearchParamState('instance');
  const [selectedColoring, setSelectedColoring] = useState<ColorOptions>('processColors');
  const [selectedElement, setSelectedElement] = useState<ElementLike | undefined>();

  const [startingInstance, setStartingInstance] = useState(false);
  const [resumingInstance, setResumingInstance] = useState(false);
  const [pausingInstance, setPausingInstance] = useState(false);
  const [stoppingInstance, setStoppingInstance] = useState(false);
  const [togglingActivation, setTogglingActivation] = useState(false);
  const [hasTimerStartEvents, setHasTimerStartEvents] = useState(false);
  const [hasPlainStartEvents, setHasPlainStartEvents] = useState(false);

  const [startForm, setStartForm] = useState('');

  const canvasRef = useRef<BPMNCanvasRef>(null);
  const [infoPanelOpen, setInfoPanelOpen] = useState(false);

  const {
    deployments,
    refetchDeployments,
    instances: knownInstances,
    refetchInstances,
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

      const rawInstances = getVersionInstances(knownInstances, selectedVersionId);
      instances = [...rawInstances].sort(
        (a, b) => new Date(b.globalStartTime).getTime() - new Date(a.globalStartTime).getTime(),
      );

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
  }, [deployments, knownInstances, selectedVersionId, selectedInstanceId]);

  const isProcessActivated = useMemo(() => {
    if (!deployments || !currentVersion) return false;
    return !!deployments.some((d) => d.versionId === currentVersion.id && d.active);
  }, [deployments, currentVersion]);

  const { data: selectedBpmn } = useQuery({
    queryFn: async () => {
      const bpmn = await getProcessBPMN(processId, spaceId, currentVersion?.id);
      if (isUserErrorResponse(bpmn)) return { bpmn: '' };
      return { bpmn };
    },
    queryKey: ['space', spaceId, 'process', processId, 'version', currentVersion?.id, 'bpmn'],
  });

  useEffect(() => {
    async function initStartEventInfo() {
      if (!selectedBpmn) return;

      try {
        const bpmnObj = await toBpmnObject(selectedBpmn.bpmn);
        const startEvents = getElementsByTagName(bpmnObj, 'bpmn:StartEvent');
        let hasTimer = false;
        let hasPlain = false;
        (startEvents as any[]).forEach((el) => {
          const defs = el?.eventDefinitions;
          if (!defs || defs.length === 0) {
            hasPlain = true;
          } else if (defs.some((def: any) => def.$type === 'bpmn:TimerEventDefinition')) {
            hasTimer = true;
          }
        });
        setHasTimerStartEvents(hasTimer);
        setHasPlainStartEvents(hasPlain);
      } catch (_) {
        setHasTimerStartEvents(false);
        setHasPlainStartEvents(false);
      }
    }

    initStartEventInfo();

    return () => {
      setHasTimerStartEvents(false);
      setHasPlainStartEvents(false);
    };
  }, [selectedBpmn]);

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
            {/* Left group: Select Instance + Filter + Color */}
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
                onOpenChange={(open) => {
                  if (open) refetchInstances();
                }}
              />

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

                      const instances = getVersionInstances(knownInstances, versionId);
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

            {/* Middle group: Start + Activate/Deactivate */}
            <ToolbarGroup>
              {hasPlainStartEvents && (
                <Tooltip title="Start new instance">
                  <Button
                    icon={<PlusOutlined style={{ color: '#52c41a' }} />}
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

                            if (!session)
                              throw new Error('Unknown user tries to start an instance!');

                            const globalVars = await getGlobalVariablesForHTML(
                              spaceId,
                              session.user.id,
                              startForm,
                            );

                            startForm = inlineScript(startForm, '', '', variableDefinitions);
                            startForm = inlineUserTaskData(
                              startForm,
                              { ...mappedVariables, ...globalVars },
                              [],
                            );

                            setStartForm(startForm);
                          } else {
                            return startInstance(versionId);
                          }
                        },
                        onSuccess: async (instanceId) => {
                          await refetchDeployments();
                          setTimeout(async () => {
                            await refetchInstances();
                            setSelectedInstanceId(instanceId);
                          }, 1000);
                        },
                      });
                      setStartingInstance(false);
                    }}
                  />
                </Tooltip>
              )}

              {/* Activate/Deactivate button which is only shown when timer start events exist */}
              {hasTimerStartEvents && (
                <Tooltip
                  title={
                    isProcessActivated
                      ? 'The process is active. Any automatically triggered Start Events, such as Timer Start Events, automatically launch new process executions. Click to deactivate.'
                      : 'The process is deactivated. Any automatically triggered Start Events, such as Timer Start Events, will not launch new process executions. Click to activate.'
                  }
                >
                  <Button
                    type="text"
                    loading={togglingActivation}
                    icon={
                      isProcessActivated ? (
                        <span className={styles.SpinIcon}>
                          <MdOutlineSync size={18} style={{ color: '#52c41a' }} />
                        </span>
                      ) : (
                        <MdOutlineSyncDisabled size={18} />
                      )
                    }
                    onClick={async () => {
                      setTogglingActivation(true);
                      const nextState = !isProcessActivated;
                      const versionId = getLatestDeployment(deployments)!.versionId;
                      await wrapServerCall({
                        fn: () =>
                          changeDeploymentActivation(processId, spaceId, versionId, nextState),
                        onSuccess: async () => {
                          await refetchDeployments();
                        },
                      });
                      setTogglingActivation(false);
                    }}
                  />
                </Tooltip>
              )}
            </ToolbarGroup>

            {/* 2-icon group: 1. Play shown when paused, Pause shown when running. 2. Stop button */}
            <div>
              {selectedInstance && (
                <ToolbarGroup>
                  {instanceIsPaused || instanceIsPausing ? (
                    // Show Resume (Play) when paused or pausing
                    <Tooltip
                      title={
                        instanceIsPausing ? 'Abort pausing the instance' : 'Resume the instance'
                      }
                    >
                      <Button
                        className={styles.PlayIcon}
                        icon={<CaretRightOutlined />}
                        loading={resumingInstance}
                        onClick={async () => {
                          setResumingInstance(true);
                          await wrapServerCall({
                            fn: () => resumeInstance(selectedInstance.processInstanceId),
                            onSuccess: async () => await refetchDeployments(),
                          });
                          setResumingInstance(false);
                        }}
                      />
                    </Tooltip>
                  ) : (
                    // Show Pause when running (or any other non-paused state)
                    <Tooltip title="Pause the instance">
                      <Button
                        className={styles.PauseIcon}
                        icon={<PauseOutlined />}
                        loading={pausingInstance}
                        disabled={!instanceIsRunning}
                        onClick={async () => {
                          setPausingInstance(true);
                          await wrapServerCall({
                            fn: async () => pauseInstance(selectedInstance.processInstanceId),
                            onSuccess: async () => await refetchDeployments(),
                          });
                          setPausingInstance(false);
                        }}
                      />
                    </Tooltip>
                  )}

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
                          onSuccess: async () => await refetchDeployments(),
                        });
                        setStoppingInstance(false);
                      }}
                    />
                  </Tooltip>
                </ToolbarGroup>
              )}
            </div>

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
                    refetch={refetchDeployments}
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
                await refetchDeployments();
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
