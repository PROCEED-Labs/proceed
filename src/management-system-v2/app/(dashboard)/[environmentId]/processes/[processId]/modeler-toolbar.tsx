import React, { ComponentProps, use, useEffect, useState } from 'react';
import { is as bpmnIs } from 'bpmn-js/lib/util/ModelUtil';
import { App, Tooltip, Button, Space, Select, SelectProps, Divider } from 'antd';
import { Toolbar, ToolbarGroup } from '@/components/toolbar';
import styles from './modeler-toolbar.module.scss';
import Icon, {
  ExportOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  UndoOutlined,
  RedoOutlined,
  ArrowUpOutlined,
  FilePdfOutlined,
  FormOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import { SvgXML } from '@/components/svg';
import PropertiesPanel from './properties-panel';
import useModelerStateStore from './use-modeler-state-store';
import { useRouter, useSearchParams } from 'next/navigation';
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
import UserTaskBuilder from './_user-task-builder';
import ScriptEditor from '@/app/(dashboard)/[environmentId]/processes/[processId]/script-editor';
import { EnvVarsContext } from '@/components/env-vars-context';
import { wrapServerCall } from '@/lib/wrap-server-call';
import { Process } from '@/lib/data/process-schema';

const LATEST_VERSION = { id: '-1', name: 'Latest Version', description: '' };

type ModelerToolbarProps = {
  process: Process;
  onOpenXmlEditor: () => void;
  canUndo: boolean;
  canRedo: boolean;
};
const ModelerToolbar = ({ process, onOpenXmlEditor, canUndo, canRedo }: ModelerToolbarProps) => {
  const processId = process.id;

  const router = useRouter();
  const environment = useEnvironment();
  const app = App.useApp();
  const message = app.message;
  const env = use(EnvVarsContext);

  const [showUserTaskEditor, setShowUserTaskEditor] = useState(false);

  const [showPropertiesPanel, setShowPropertiesPanel] = useState(false);
  const [showScriptTaskEditor, setShowScriptTaskEditor] = useState(false);

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareModalDefaultOpenTab, setShareModalDefaultOpenTab] =
    useState<ComponentProps<typeof ShareModal>['defaultOpenTab']>(undefined);

  const query = useSearchParams();
  const subprocessId = query.get('subprocess');

  const modeler = useModelerStateStore((state) => state.modeler);
  const selectedElementId = useModelerStateStore((state) => state.selectedElementId);
  const selectedElement = modeler
    ? selectedElementId
      ? modeler.getElement(selectedElementId)
      : modeler.getCurrentRoot()
    : undefined;
  // Force rerender when the BPMN changes.
  useModelerStateStore((state) => state.changeCounter);

  useEffect(() => {
    if (modeler && showUserTaskEditor) {
      // TODO: maybe  do this without an effect
      modeler.deactivateKeyboard();
    } else if (modeler) {
      modeler.activateKeyboard();
    }
  }, [modeler, showUserTaskEditor]);

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

  const handleOpenDocumentation = () => {
    // the timestamp does not matter here since it is overridden by the user being an owner of the process
    return wrapServerCall({
      fn: () =>
        generateSharedViewerUrl({ processId, timestamp: 0 }, selectedVersionId || undefined),
      onSuccess: (url) => window.open(url, `${processId}-${selectedVersionId}-tab`),
      app,
    });
  };
  const filterOption: SelectProps['filterOption'] = (input, option) =>
    ((option?.label as string) ?? '').toLowerCase().includes(input.toLowerCase());

  const selectedVersion =
    process.versions.find((version) => version.id === (selectedVersionId ?? '-1')) ??
    LATEST_VERSION;

  const showMobileView = useMobileModeler();

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
                    `/processes/${processId as string}${
                      searchParams.size ? '?' + searchParams.toString() : ''
                    }`,
                  ),
                );
              }}
              options={[LATEST_VERSION].concat(process.versions ?? []).map(({ id, name }) => ({
                value: id,
                label: name,
              }))}
            />
            {!showMobileView && (
              <>
                <Tooltip title="Create New Version">
                  <VersionCreationButton
                    icon={<PlusOutlined />}
                    createVersion={createProcessVersion}
                  ></VersionCreationButton>
                </Tooltip>
                <Tooltip title="Back to parent">
                  <Button
                    icon={<ArrowUpOutlined />}
                    disabled={!subprocessId}
                    onClick={handleReturnToParent}
                  />
                </Tooltip>
                <Tooltip title="Undo">
                  <Button icon={<UndoOutlined />} onClick={handleUndo} disabled={!canUndo}></Button>
                </Tooltip>
                <Tooltip title="Redo">
                  <Button icon={<RedoOutlined />} onClick={handleRedo} disabled={!canRedo}></Button>
                </Tooltip>
              </>
            )}
          </ToolbarGroup>

          <ToolbarGroup>
            {selectedElementId &&
              selectedElement &&
              ((env.PROCEED_PUBLIC_ENABLE_EXECUTION && bpmnIs(selectedElement, 'bpmn:UserTask') && (
                <Tooltip title="Edit User Task Form">
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
                (env.PROCEED_PUBLIC_ENABLE_EXECUTION &&
                  bpmnIs(selectedElement, 'bpmn:ScriptTask') && (
                    <Tooltip title="Edit Script Task">
                      <Button
                        icon={<FormOutlined />}
                        onClick={() => setShowScriptTaskEditor(true)}
                      />
                    </Tooltip>
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
                    onClick={onOpenXmlEditor}
                  />
                </Tooltip>
              )}
              <Divider type="vertical" style={{ alignSelf: 'stretch', height: 'auto' }} />
              <Tooltip title="Open Documentation">
                <Button icon={<FilePdfOutlined />} onClick={handleOpenDocumentation} />
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
                    icon={<ExportOutlined />}
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
      {env.PROCEED_PUBLIC_ENABLE_EXECUTION && (
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
        </>
      )}
    </>
  );
};

export default ModelerToolbar;
