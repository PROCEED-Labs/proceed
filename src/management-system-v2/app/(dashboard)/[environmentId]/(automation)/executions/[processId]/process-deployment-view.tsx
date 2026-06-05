// TODO: remove the use client if this page is used in server
'use client';

import { Button, Select, Tooltip, Space, Dropdown, Result, Skeleton, Avatar } from 'antd';
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
  ExportOutlined,
  WarningTwoTone,
} from '@ant-design/icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import contentStyles from './content.module.scss';
import toolbarStyles from '@/app/(dashboard)/[environmentId]/processes/[mode]/[processId]/modeler-toolbar.module.scss';
import styles from './process-deployment-view.module.scss';
import InstanceInfoPanel from './instance-info-panel';
import { useSearchParamState } from '@/lib/use-search-param-state';
import { MdOutlineColorLens, MdOutlineSync, MdOutlineSyncDisabled } from 'react-icons/md';
import { ColorOptions, colorOptions } from './instance-coloring';
import { RemoveReadOnly, truthyFilter } from '@/lib/typescript-utils';
import type { ElementLike } from 'diagram-js/lib/core/Types';
import { wrapServerCall } from '@/lib/wrap-server-call';
import { getLatestDeployment, getVersionInstances, getYoungestInstance } from './instance-helpers';

import useColors from './use-colors';
import useTokens from './use-tokens';
import StartFormModal from './start-form-modal';
import useInstanceVariables from './use-instance-variables';
import { inlineScript, inlineUserTaskData } from '@proceed/user-task-helper';
import { toBpmnObject, getElementsByTagName } from '@proceed/bpmn-helper';
import {
  getProcessActivationStatus,
  changeDeploymentActivation,
} from '@/lib/executions/deployment-server-actions';
import { getGlobalVariablesForHTML } from '@/lib/tasks/server-actions';
import { useSession } from 'next-auth/react';
import { useEnvironment } from '@/components/auth-can';

import { GrDocumentUser } from 'react-icons/gr';
import { handleOpenDocumentation } from '../../../processes/processes-helper';
import {
  exportInstanceData,
  getProcessStartForm,
  pauseInstance,
  resumeInstance,
  startInstance,
  stopInstance,
} from '@/lib/executions/instance-server-actions';
import { useQuery } from '@tanstack/react-query';
import { getProcessDeployments } from '@/lib/data/deployment';
import { isSuccessResponse, isUserErrorResponse, userError } from '@/lib/user-error';
import { getInstance } from '@/lib/data/instance';
import { asyncMap, pick } from '@/lib/helpers/javascriptHelpers';
import { getProcessBPMN } from '@/lib/data/processes';
import { enableInstanceCSVExport } from 'FeatureFlags';
import jsonToCsvExport from 'json-to-csv-export';

export default function ProcessDeploymentView({ processId }: { processId: string }) {
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

  // get information where the process is deployed and which instances exist
  const { data: deployments, refetch: refetchDeployments } = useQuery({
    queryFn: async () => {
      const deployments = await getProcessDeployments(spaceId, processId);
      if (isUserErrorResponse(deployments)) return null;
      return deployments;
    },
    queryKey: ['processDeployments', spaceId, processId],
    refetchInterval: 1000,
  });

  // keep a list of known instances to trigger refetches only when necessary
  const instanceIds = useMemo(() => {
    if (!deployments) return '';

    const instanceMap = {} as Record<string, boolean>;

    for (const deployment of deployments) {
      for (const instanceId of deployment.instances) {
        instanceMap[instanceId] = true;
      }
    }

    return Object.keys(instanceMap).join(',');
  }, [deployments]);

  // fetch initial data for all instances of the process when the list of instances changed
  const { data: knownInstances, refetch: refetchInstances } = useQuery({
    queryFn: async () => {
      if (!instanceIds) return [];

      const instances = (
        await asyncMap(instanceIds.split(','), async (instanceId) =>
          getInstance(spaceId, instanceId),
        )
      )
        .filter(isSuccessResponse)
        .filter(truthyFilter)
        .map((i) => i.state);

      return instances;
    },
    queryKey: ['processDeployments', spaceId, processId, 'instances', instanceIds],
    initialData: [],
    enabled: !!instanceIds,
  });

  const { selectedVersion, versionInstances, currentVersion } = useMemo(() => {
    let selectedVersion, versionInstances, currentVersion;

    if (deployments?.length) {
      selectedVersion = deployments.find((d) => d.versionId === selectedVersionId)?.version;

      // sort instances newest first
      const rawInstances = getVersionInstances(knownInstances, selectedVersionId);
      versionInstances = [...rawInstances].sort(
        (a, b) => new Date(b.globalStartTime).getTime() - new Date(a.globalStartTime).getTime(),
      );

      const selectedInstance = selectedInstanceId
        ? versionInstances.find((i) => i.processInstanceId === selectedInstanceId)
        : undefined;

      let currentVersionId = getLatestDeployment(deployments)!.versionId;
      if (selectedInstance) {
        currentVersionId = selectedInstance.processVersion;
      } else if (selectedVersionId) {
        currentVersionId = selectedVersionId;
      }
      currentVersion = deployments.find((d) => d.versionId === currentVersionId)!.version;
    }

    return {
      selectedVersion,
      versionInstances,
      currentVersion,
    };
  }, [deployments, knownInstances, selectedVersionId, selectedInstanceId]);

  const { data: currentInstance, refetch: refetchCurrentInstance } = useQuery({
    queryKey: ['processDeployments', spaceId, processId, 'instance', selectedInstanceId],
    queryFn: async () => {
      if (!selectedInstanceId) return null;
      const instance = await getInstance(spaceId, selectedInstanceId);

      if (isUserErrorResponse(instance)) return null;
      if (!instance) return null;

      return {
        ...instance.state,
        ...pick(instance, ['engines', 'executionStatus', 'pausing', 'paused', 'offline']),
      };
    },
    enabled: !!selectedInstanceId,
    refetchInterval: 1000,
  });

  const {
    data: isProcessActivated,
    isFetching: isActivationLoading,
    refetch: refetchActivation,
  } = useQuery({
    queryFn: async () => {
      if (!currentVersion) return false;
      const status = await getProcessActivationStatus(processId, spaceId, currentVersion.id);

      if (isUserErrorResponse(status)) return false;
      return status;
    },
    queryKey: ['processActivation', spaceId, processId, currentVersion],
  });

  const { data: selectedBpmn } = useQuery({
    queryFn: async () => {
      const bpmn = await getProcessBPMN(processId, spaceId, currentVersion?.id);
      if (isUserErrorResponse(bpmn)) return undefined;
      return { bpmn };
    },
    queryKey: ['space', spaceId, 'process', processId, 'version', currentVersion?.id || '', 'bpmn'],
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
      } catch (_) {}
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

  const { refreshTokens } = useTokens(currentInstance || null, canvasRef);
  const { refreshColoring } = useColors(
    selectedBpmn,
    selectedColoring,
    currentInstance || undefined,
    canvasRef,
  );
  const refreshVisuals = useCallback(() => {
    refreshTokens();
    refreshColoring();
  }, [refreshTokens, refreshColoring]);

  if (!deployments || !selectedBpmn) {
    return (
      <Content>
        <Skeleton loading />
      </Content>
    );
  }

  if (!deployments.length) {
    return (
      <Content>
        <Result status="404" title="The process does not seem to be deployed anymore." />
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
                value={currentInstance?.processInstanceId}
                variant="borderless"
                onSelect={(value) => setSelectedInstanceId(value)}
                options={versionInstances?.map((instance, idx) => ({
                  value: instance.processInstanceId,
                  label: `${idx + 1}. Instance: ${new Date(instance.globalStartTime).toLocaleString()}`,
                }))}
                placeholder="Select an instance"
              />

              {currentInstance?.offline && (
                <Tooltip title="Some of the engines this process is executed on are not reachable!">
                  <Avatar
                    icon={
                      <WarningTwoTone
                        twoToneColor="orange"
                        style={{ width: '16px', height: '16px' }}
                      />
                    }
                    size={40}
                    style={{ backgroundColor: 'inherit' }}
                  />
                </Tooltip>
              )}

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
                      ...deployments.map(({ version }) => ({
                        label: version.name,
                        key: `${version.id}`,
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

                          let startForm = await getProcessStartForm(spaceId, processId, versionId);

                          if (typeof startForm !== 'string') return startForm;

                          if (startForm) {
                            const mappedVariables = Object.fromEntries(
                              variables
                                .filter((variable) => variable.value !== undefined)
                                .map((variable) => [variable.name, variable.value]),
                            );

                            if (!session)
                              return userError('Unknown user tries to start an instance!');

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
                            return startInstance(spaceId, processId, versionId);
                          }
                        },
                        onSuccess: async (instanceId) => {
                          if (instanceId) {
                            await refetchDeployments();
                            setTimeout(async () => {
                              await refetchInstances();
                              setSelectedInstanceId(instanceId);
                            }, 1000);
                          }
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
                    loading={togglingActivation || isActivationLoading}
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
                        onSuccess: () => refetchActivation(),
                      });
                      setTogglingActivation(false);
                    }}
                  />
                </Tooltip>
              )}
            </ToolbarGroup>

            {/* 2-icon group: 1. Play shown when paused, Pause shown when running. 2. Stop button */}
            <div>
              {currentInstance && (
                <ToolbarGroup>
                  {currentInstance.paused || currentInstance.pausing ? (
                    // Show Resume (Play) when paused or pausing
                    <Tooltip
                      title={
                        currentInstance.pausing
                          ? 'Abort pausing the instance'
                          : 'Resume the instance'
                      }
                    >
                      <Button
                        className={styles.PlayIcon}
                        icon={<CaretRightOutlined />}
                        disabled={currentInstance.offline}
                        loading={resumingInstance}
                        onClick={async () => {
                          setResumingInstance(true);
                          await wrapServerCall({
                            fn: () =>
                              resumeInstance(spaceId, processId, currentInstance.processInstanceId),
                            onSuccess: async () => await refetchCurrentInstance(),
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
                        disabled={
                          currentInstance.offline || currentInstance.executionStatus !== 'Running'
                        }
                        onClick={async () => {
                          setPausingInstance(true);
                          await wrapServerCall({
                            fn: async () =>
                              pauseInstance(spaceId, processId, currentInstance.processInstanceId),
                            onSuccess: async () => await refetchCurrentInstance(),
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
                      disabled={
                        currentInstance.offline || currentInstance.executionStatus !== 'Running'
                      }
                      onClick={async () => {
                        setStoppingInstance(true);
                        await wrapServerCall({
                          fn: async () =>
                            stopInstance(spaceId, processId, currentInstance.processInstanceId),
                          onSuccess: async () => await refetchCurrentInstance(),
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
                {enableInstanceCSVExport && (
                  <>
                    <Tooltip title={'Export data of this selected instance as a csv file'}>
                      <Button
                        onClick={() => {
                          if (currentInstance) {
                            wrapServerCall({
                              fn: () =>
                                exportInstanceData(
                                  spaceId,
                                  processId,
                                  currentInstance.processInstanceId,
                                ),
                              onSuccess: (data) =>
                                jsonToCsvExport({
                                  data,
                                }),
                            });
                          }
                        }}
                      >
                        <div
                          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                        >
                          <ExportOutlined style={{ fontSize: '18px' }} />
                          <span style={{ fontSize: '8px', fontWeight: 'bold', lineHeight: 1 }}>
                            THIS
                          </span>
                        </div>
                      </Button>
                    </Tooltip>
                    <Tooltip title={'Export data of all instances to this process as a csv file'}>
                      <Button
                        onClick={() =>
                          wrapServerCall({
                            fn: () => exportInstanceData(spaceId, processId),
                            onSuccess: (data) => jsonToCsvExport({ data }),
                          })
                        }
                      >
                        <div
                          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                        >
                          <ExportOutlined style={{ fontSize: '18px' }} />
                          <span style={{ fontSize: '8px', fontWeight: 'bold', lineHeight: 1 }}>
                            ALL
                          </span>
                        </div>
                      </Button>
                    </Tooltip>
                  </>
                )}
                {currentInstance && (
                  <Tooltip title="View Instance Documentation">
                    <Button
                      aria-label="view-instance-documentation"
                      icon={<GrDocumentUser />}
                      onClick={() =>
                        handleOpenDocumentation(
                          processId,
                          spaceId,
                          currentInstance.processVersion,
                          currentInstance.processInstanceId,
                          selectedColoring,
                        )
                      }
                    />
                  </Tooltip>
                )}
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
                    instance={currentInstance || undefined}
                    element={selectedElement}
                    open={infoPanelOpen}
                    close={() => setInfoPanelOpen(false)}
                    refetch={refetchCurrentInstance}
                  />
                </div>
              )}
            </Space>
          </Space>
        </Toolbar>

        <StartFormModal
          html={startForm}
          onSubmit={async (submitVariables) => {
            // start the instance with the initial variable values from the start form
            await wrapServerCall({
              fn: async () => {
                const deployment = getLatestDeployment(deployments);

                if (!deployment) {
                  return userError('The current process does not seem to be deployed.');
                }

                const mappedVariables: Record<string, { value: any }> = {};

                // set the values of variables to the ones coming from the start form
                Object.entries(submitVariables).forEach(
                  ([key, value]) => (mappedVariables[key] = { value }),
                );

                return startInstance(
                  spaceId,
                  deployment.processId,
                  deployment.version.id,
                  mappedVariables,
                );
              },
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
