import { ComponentProps, use, useEffect, useState } from 'react';
import { is as bpmnIs } from 'bpmn-js/lib/util/ModelUtil';
import { App, Tooltip, Button, Space, Select, SelectProps, Divider } from 'antd';
import { Toolbar, ToolbarGroup } from '@/components/toolbar';
import styles from './modeler-toolbar.module.scss';
import Icon, {
  InfoCircleOutlined,
  PlusOutlined,
  UndoOutlined,
  RedoOutlined,
  ArrowUpOutlined,
  FormOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import { GrDocumentUser } from 'react-icons/gr';
import { PiDownloadSimple } from 'react-icons/pi';
import { SvgGantt, SvgXML } from '@/components/svg';
import PropertiesPanel from './properties-panel';
import useModelerStateStore from './use-modeler-state-store';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import VersionCreationButton from '@/components/version-creation-button';
import useMobileModeler from '@/lib/useMobileModeler';
import { createVersion, updateProcess, getProcessBPMN } from '@/lib/data/processes';
import { Root } from 'bpmn-js/lib/model/Types';
import { useEnvironment } from '@/components/auth-can';
import { ShareModal } from '@/components/share-modal/share-modal';
import { useAddControlCallback } from '@/lib/controls-store';
import { spaceURL } from '@/lib/utils';
import { generateSharedViewerUrl } from '@/lib/sharing/process-sharing';
import { isUserErrorResponse } from '@/lib/user-error';
import UserTaskBuilder, { canHaveForm } from './_user-task-builder';
import ScriptEditor from '@/app/(dashboard)/[environmentId]/processes/[mode]/[processId]/script-editor';
import useTimelineViewStore from '@/lib/use-timeline-view-store';
import { handleOpenDocumentation } from '../../processes-helper';
import { EnvVarsContext } from '@/components/env-vars-context';
import { getSpaceSettingsValues } from '@/lib/data/space-settings';
import { Process } from '@/lib/data/process-schema';
import FlowConditionModal, { isConditionalFlow } from './flow-condition-modal';
import { TimerEventButton, isTimerEvent } from './planned-duration-input';
import XmlEditor from './xml-editor';
import { useProcessView } from './process-view-context';

const LATEST_VERSION = { id: '-1', name: 'Latest Version', description: '' };

type ModelerToolbarProps = {
  process: Process;
  canUndo: boolean;
  canRedo: boolean;
  versionName?: string;
};
const ModelerToolbar = ({ process, canRedo, canUndo, versionName }: ModelerToolbarProps) => {
  const processId = process.id;

  const router = useRouter();
  const pathname = usePathname();
  const environment = useEnvironment();
  const app = App.useApp();
  const message = app.message;
  const env = use(EnvVarsContext);

  const [showUserTaskEditor, setShowUserTaskEditor] = useState(false);

  const [showPropertiesPanel, setShowPropertiesPanel] = useState(false);
  const [showScriptTaskEditor, setShowScriptTaskEditor] = useState(false);
  const [showFlowNodeConditionModal, setShowFlowNodeConditionModal] = useState(false);

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareModalDefaultOpenTab, setShareModalDefaultOpenTab] =
    useState<ComponentProps<typeof ShareModal>['defaultOpenTab']>(undefined);

  const enableTimelineView = useTimelineViewStore((state) => state.enableTimelineView);

  const [ganttEnabled, setGanttEnabled] = useState<boolean | null>(null);

  // Fetch gantt view settings
  useEffect(() => {
    const fetchGanttSettings = async () => {
      try {
        const settingsResult = await getSpaceSettingsValues(
          environment.spaceId,
          'process-documentation',
        );

        // Handle userError result from server action (e.g., permission errors)
        if (isUserErrorResponse(settingsResult)) {
          console.warn('Cannot access settings, using defaults:', settingsResult.error.message);
          setGanttEnabled(true);
          return;
        }

        const ganttViewSettings = settingsResult?.['gantt-view'];
        setGanttEnabled(ganttViewSettings?.enabled ?? true);
      } catch (error) {
        console.warn('Failed to fetch gantt view settings, using defaults:', error);
        setGanttEnabled(true);
      }
    };

    fetchGanttSettings();
  }, [environment.spaceId]);

  const query = useSearchParams();
  const subprocessId = query.get('subprocess');

  const { isListView } = useProcessView();
  const isReadOnlyListView = isListView;
  
  const processContextPath = pathname.split('/').slice(0, -1).join('/');

  const modeler = useModelerStateStore((state) => state.modeler);
  const selectedElementId = useModelerStateStore((state) => state.selectedElementId);
  const selectedElement = modeler
    ? selectedElementId
      ? modeler.getElement(selectedElementId)
      : modeler.getCurrentRoot()
    : undefined;
  // Force rerender when the BPMN changes.
  useModelerStateStore((state) => state.changeCounter);

  const [xmlEditorBpmn, setXmlEditorBpmn] = useState<string | undefined>(undefined);
  const handleOpenXmlEditor = async () => {
    // Undefined can maybe happen when click happens during router transition?
    if (modeler) {
      const xml = await modeler.getXML();
      setXmlEditorBpmn(xml);
    }
  };
  const handleXmlEditorSave = async (bpmn: string) => {
    if (modeler) {
      await modeler.loadBPMN(bpmn);
      // If the bpmn contains unexpected content (text content for an element
      // where the model does not define text) the modeler will remove it
      // automatically => make sure the stored bpmn is the same as the one in
      // the modeler.
      const cleanedBpmn = await modeler.getXML();
      await updateProcess(process.id, environment.spaceId, cleanedBpmn);
    }
  };

  const modalOpen =
    showUserTaskEditor ||
    showPropertiesPanel ||
    showScriptTaskEditor ||
    shareModalOpen ||
    !!xmlEditorBpmn;

  useEffect(() => {
    if (modalOpen) {
      modeler?.deactivateKeyboard();
    } else modeler?.activateKeyboard();
  }, [modeler, modalOpen]);

  useAddControlCallback(
    'modeler',
    'cut',
    () => {
      if (!modalOpen) handleOpenXmlEditor();
    },
    { blocking: modalOpen },
  );

  const selectedVersionId = query.get('version');

  const createProcessVersion = async (values: {
    versionName: string;
    versionDescription: string;
  }) => {
    try {
      // Ensure latest BPMN on server.
      const xml = (await modeler?.getXML()) as string;
      if (isUserErrorResponse(await updateProcess(processId, environment.spaceId, xml)))
        throw new Error();

      if (
        isUserErrorResponse(
          await createVersion(
            values.versionName,
            values.versionDescription,
            processId,
            environment.spaceId,
          ),
        )
      )
        throw new Error();

      // reimport the new version since the backend has added versionBasedOn information that would
      // be overwritten by following changes
      const newBpmn = await getProcessBPMN(processId, environment.spaceId);
      if (newBpmn && typeof newBpmn === 'string') {
        await modeler?.loadBPMN(newBpmn);
      }

      router.refresh();
      message.success('Version Created');
    } catch (_) {
      message.error('Something went wrong');
    }
  };
  const handlePropertiesPanelToggle = () => {
    setShowPropertiesPanel(!showPropertiesPanel);
  };

  useAddControlCallback('modeler', 'control+enter', () => {
    setShowPropertiesPanel(true); /* This does not cause rerenders if it is already set to true */
  });
  useAddControlCallback('modeler', 'esc', () => {
    setShowPropertiesPanel(false);
  });

  useAddControlCallback(
    'modeler',
    ['export', 'shift+enter'],
    () => {
      setShareModalOpen(true);
      setShareModalDefaultOpenTab((prev) => (prev === 'bpmn' ? prev : 'bpmn'));
    },
    {},
  );

  const handleUndo = () => {
    modeler?.undo();
  };

  const handleRedo = () => {
    modeler?.redo();
  };

  useAddControlCallback('modeler', 'undo', handleUndo, { dependencies: [modeler] });
  useAddControlCallback('modeler', 'redo', handleRedo, { dependencies: [modeler] });

  const handleReturnToParent = async () => {
    if (modeler) {
      const canvas = modeler.getCanvas();
      canvas.setRootElement(canvas.findRoot(subprocessId as string) as Root);
      modeler.fitViewport();
    }
  };

  const handleOpeningSubprocess = async () => {
    if (modeler && selectedElement) {
      const canvas = modeler.getCanvas();
      canvas.setRootElement(canvas.findRoot(selectedElement.id + '_plane') as Root);
      modeler.fitViewport();
    }
  };

  const filterOption: SelectProps['filterOption'] = (input, option) =>
    ((option?.label as string) ?? '').toLowerCase().includes(input.toLowerCase());

  const selectedVersion =
    process.versions.find((version) => version.id === (selectedVersionId ?? '-1')) ??
    LATEST_VERSION;

  const showMobileView = useMobileModeler();

  let formEditorTitle = '';

  if (canHaveForm(selectedElement)) {
    if (bpmnIs(selectedElement, 'bpmn:UserTask')) {
      formEditorTitle = 'Edit User Task Form';
    } else if (bpmnIs(selectedElement, 'bpmn:StartEvent')) {
      formEditorTitle = 'Edit Process Start Form';
    }
  }

  return (
    <>
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
              popupMatchSelectWidth={false}
              placeholder="Select Version"
              showSearch
              filterOption={filterOption}
              value={selectedVersion.id}
              onChange={(value) => {
                // change the version info in the query but keep other info (e.g. the currently open subprocess)
                const searchParams = new URLSearchParams(query);
                if (!value || value === '-1') searchParams.delete('version');
                else searchParams.set(`version`, `${value}`);
                router.push(
                  spaceURL(
                    environment,
                    `${processContextPath}/${processId as string}${
                      searchParams.size ? '?' + searchParams.toString() : ''
                    }`,
                  ),
                );
              }}
              options={(isReadOnlyListView ? [] : [LATEST_VERSION])
                .concat(process.versions ?? [])
                .map(({ id, name }) => ({
                  value: id,
                  label: name,
                }))}
            />
            {!showMobileView && LATEST_VERSION.id === selectedVersion.id && (
              <>
                <Tooltip title="Create New Version">
                  <VersionCreationButton
                    icon={<PlusOutlined />}
                    createVersion={createProcessVersion}
                    disabled={isReadOnlyListView}
                  ></VersionCreationButton>
                </Tooltip>
                <Tooltip title="Undo">
                  <Button icon={<UndoOutlined />} onClick={handleUndo} disabled={!canUndo}></Button>
                </Tooltip>
                <Tooltip title="Redo">
                  <Button icon={<RedoOutlined />} onClick={handleRedo} disabled={!canRedo}></Button>
                </Tooltip>
              </>
            )}{' '}
            {!showMobileView && (
              <Tooltip title="Back to parent">
                <Button
                  icon={<ArrowUpOutlined />}
                  disabled={!subprocessId}
                  onClick={handleReturnToParent}
                />
              </Tooltip>
            )}
          </ToolbarGroup>

          <ToolbarGroup>
            {selectedElementId &&
              selectedElement &&
              ((env.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE &&
                canHaveForm(selectedElement) &&
                !isReadOnlyListView && (
                  <Tooltip title={formEditorTitle}>
                    <Button icon={<FormOutlined />} onClick={() => setShowUserTaskEditor(true)} />
                  </Tooltip>
                )) ||
                (bpmnIs(selectedElement, 'bpmn:SubProcess') && selectedElement.collapsed && (
                  <Tooltip title="Open Subprocess">
                    <Button style={{ fontSize: '0.875rem' }} onClick={handleOpeningSubprocess}>
                      Open Subprocess
                    </Button>
                  </Tooltip>
                )) ||
                (env.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE &&
                  bpmnIs(selectedElement, 'bpmn:ScriptTask') &&
                  !isReadOnlyListView && (
                    <Tooltip title="Edit Script Task">
                      <Button
                        icon={<FormOutlined />}
                        onClick={() => setShowScriptTaskEditor(true)}
                      />
                    </Tooltip>
                  )) ||
                (env.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE &&
                  isConditionalFlow(selectedElement) && (
                    <Tooltip title="Edit Condition">
                      <Button
                        icon={<FormOutlined />}
                        onClick={() => setShowFlowNodeConditionModal(true)}
                      />
                    </Tooltip>
                  )) ||
                (env.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE && isTimerEvent(selectedElement) && (
                  <TimerEventButton element={selectedElement} />
                )))}
          </ToolbarGroup>

          <Space style={{ height: '3rem' }}>
            <ToolbarGroup>
              <Tooltip
                title={showPropertiesPanel ? 'Close Properties Panel' : 'Open Properties Panel'}
              >
                <Button icon={<InfoCircleOutlined />} onClick={handlePropertiesPanelToggle} />
              </Tooltip>
              {!showMobileView && (
                <Tooltip title="Show XML">
                  <Button
                    icon={<Icon aria-label="xml-sign" component={SvgXML} />}
                    onClick={handleOpenXmlEditor}
                  />
                </Tooltip>
              )}
              {env.PROCEED_PUBLIC_GANTT_ACTIVE === true && ganttEnabled === true && (
                <Tooltip title="Switch to Gantt view">
                  <Button
                    icon={<Icon aria-label="gantt-view" component={SvgGantt} />}
                    onClick={() => {
                      enableTimelineView();
                      // Use router to preserve the current URL and just add the hash
                      const currentUrl = window.location.pathname + window.location.search;
                      window.history.replaceState(null, '', currentUrl + '#gantt-view');
                    }}
                  ></Button>
                </Tooltip>
              )}
              <Divider type="vertical" style={{ alignSelf: 'stretch', height: 'auto' }} />
              <Tooltip title="View Process Documentation">
                <Button
                  aria-label="view-documentation"
                  icon={<GrDocumentUser />}
                  onClick={() => {
                    handleOpenDocumentation(processId, selectedVersionId || undefined);
                  }}
                />
              </Tooltip>
              <Tooltip title="Share">
                <Button
                  icon={<ShareAltOutlined />}
                  onClick={() => {
                    setShareModalOpen(true);
                    setShareModalDefaultOpenTab((prev) =>
                      prev === 'bpmn' ? 'share-public-link' : undefined,
                    );
                  }}
                />
              </Tooltip>
              {!showMobileView && (
                <Tooltip title="Download">
                  <Button
                    icon={<PiDownloadSimple />}
                    onClick={() => {
                      setShareModalOpen(true);
                      setShareModalDefaultOpenTab('bpmn');
                    }}
                  />
                </Tooltip>
              )}
            </ToolbarGroup>

            {showPropertiesPanel && selectedElement && (
              <PropertiesPanel
                isOpen={showPropertiesPanel}
                close={handlePropertiesPanelToggle}
                selectedElement={selectedElement}
                readOnly={isReadOnlyListView}
              />
            )}
          </Space>
        </Space>
      </Toolbar>
      <ShareModal
        processes={[process]}
        open={shareModalOpen}
        setOpen={setShareModalOpen}
        defaultOpenTab={shareModalDefaultOpenTab}
      />
      <XmlEditor
        bpmn={xmlEditorBpmn}
        canSave={!selectedVersionId}
        onClose={() => setXmlEditorBpmn(undefined)}
        onSaveXml={handleXmlEditorSave}
        process={process}
        versionName={versionName}
      />

      {env.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE && (
        <>
          <UserTaskBuilder
            processId={processId}
            open={showUserTaskEditor}
            onClose={() => setShowUserTaskEditor(false)}
          />

          <ScriptEditor
            processId={processId}
            open={showScriptTaskEditor}
            onClose={() => setShowScriptTaskEditor(false)}
            selectedElement={selectedElement}
          />

          <FlowConditionModal
            open={showFlowNodeConditionModal}
            onClose={() => setShowFlowNodeConditionModal(false)}
            element={selectedElement}
          />
        </>
      )}
    </>
  );
};

export default ModelerToolbar;
