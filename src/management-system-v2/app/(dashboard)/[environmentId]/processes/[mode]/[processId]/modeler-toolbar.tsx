import { ComponentProps, use, useEffect, useState } from 'react';
import { is as bpmnIs } from 'bpmn-js/lib/util/ModelUtil';
import { Tooltip, Button, Space, Divider } from 'antd';
import { Toolbar, ToolbarGroup } from '@/components/toolbar';
import styles from './modeler-toolbar.module.scss';
import Icon, {
  InfoCircleOutlined,
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
import { useSearchParams } from 'next/navigation';
import useMobileModeler from '@/lib/useMobileModeler';
import { updateProcess } from '@/lib/data/processes';
import { Root } from 'bpmn-js/lib/model/Types';
import { useEnvironment } from '@/components/auth-can';
import { ShareModal } from '@/components/share-modal/share-modal';
import { useAddControlCallback } from '@/lib/controls-store';
import { isUserErrorResponse } from '@/lib/user-error';
import useTimelineViewStore from '@/lib/use-timeline-view-store';
import { handleOpenDocumentation } from '../../processes-helper';
import { EnvVarsContext } from '@/components/env-vars-context';
import { getSpaceSettingsValues } from '@/lib/data/space-settings';
import { Process } from '@/lib/data/process-schema';
import FlowConditionModal, { isConditionalFlow } from './flow-condition-modal';
import { TimerEventButton, isTimerEvent } from './planned-duration-input';
import XmlEditor from './xml-editor';
import UserTaskEditor, { canHaveForm } from './user-task-editor';
import { useProcessView } from './process-view-context';
import { useCanEdit } from '@/lib/can-edit-context';
import { Element } from 'bpmn-js/lib/model/Types';
import { ScriptTaskEditorEnvironment } from './script-task-editor/script-task-editor-environment';
import { Folder } from '@/lib/data/folder-schema';

import VersionAndDeploy, { LATEST_VERSION } from './version-and-deploy-section';

type ModelerToolbarProps = {
  process: Process;
  folder?: Folder;
  canUndo: boolean;
  canRedo: boolean;
  versionName?: string;
};
const ModelerToolbar = ({
  process,
  folder,
  canRedo,
  canUndo,
  versionName,
}: ModelerToolbarProps) => {
  const processId = process.id;

  const environment = useEnvironment();
  const env = use(EnvVarsContext);

  const [showUserTaskEditor, setShowUserTaskEditor] = useState(false);

  const [showPropertiesPanel, setShowPropertiesPanel] = useState(false);
  const [showFlowNodeConditionModal, setShowFlowNodeConditionModal] = useState(false);
  const [selectedScriptTask, setSelectedScriptTask] = useState<Element | undefined>();

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareModalDefaultOpenTab, setShareModalDefaultOpenTab] =
    useState<ComponentProps<typeof ShareModal>['defaultOpenTab']>(undefined);

  const enableTimelineView = useTimelineViewStore((state) => state.enableTimelineView);

  const [ganttEnabled, setGanttEnabled] = useState<boolean | null>(null);

  const editingEnabled = useCanEdit();

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

  const modeler = useModelerStateStore((state) => state.modeler);
  const isExecutable = useModelerStateStore((state) => state.isExecutable);
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
    shareModalOpen ||
    !!xmlEditorBpmn ||
    !!selectedScriptTask;

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
            <VersionAndDeploy process={process} />
            {!showMobileView && LATEST_VERSION.id === selectedVersion.id && (
              <>
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
                !isListView && (
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
                  !isListView && (
                    <Tooltip title="Edit Script Task">
                      <Button
                        icon={<FormOutlined />}
                        onClick={() => setSelectedScriptTask(selectedElement)}
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
                readOnly={isListView || !editingEnabled}
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
      {!!xmlEditorBpmn && (
        <XmlEditor
          bpmn={xmlEditorBpmn}
          canSave={!selectedVersionId}
          onClose={() => setXmlEditorBpmn(undefined)}
          onSaveXml={handleXmlEditorSave}
          process={process}
          versionName={versionName}
        />
      )}

      {env.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE && (
        <>
          <UserTaskEditor
            processId={processId}
            open={showUserTaskEditor}
            onClose={() => setShowUserTaskEditor(false)}
          />

          <ScriptTaskEditorEnvironment
            process={process}
            folder={folder}
            selectedElement={selectedScriptTask}
            close={() => setSelectedScriptTask(undefined)}
          />

          <FlowConditionModal
            open={showFlowNodeConditionModal}
            onClose={() => setShowFlowNodeConditionModal(false)}
            element={selectedElement}
            readOnly={isListView || !editingEnabled || !isExecutable}
          />
        </>
      )}
    </>
  );
};

export default ModelerToolbar;
