'use client';

import React, { useEffect, useState } from 'react';

import type ElementRegistry from 'diagram-js/lib/core/ElementRegistry';
import type CommandStack from 'diagram-js/lib/command/CommandStack';

import { Tooltip, Button, Space } from 'antd';
import { Toolbar, ToolbarGroup } from './toolbar';

import Icon, {
  ExportOutlined,
  SettingOutlined,
  PlusOutlined,
  UndoOutlined,
  RedoOutlined,
} from '@ant-design/icons';

import { SvgXML, SvgShare } from '@/components/svg';

import PropertiesPanel from './properties-panel';

import useModelerStateStore from '@/lib/use-modeler-state-store';
import { useParams, useSearchParams } from 'next/navigation';

import ProcessExportModal from './process-export';

import { createNewProcessVersion } from '@/lib/helpers/processVersioning';
import VersionCreationButton from './version-creation-button';

import { useInvalidateAsset } from '@/lib/fetch-data';

type ModelerToolbarProps = {
  onOpenXmlEditor: () => void;
};
const ModelerToolbar: React.FC<ModelerToolbarProps> = ({ onOpenXmlEditor }) => {
  /* ICONS: */
  const svgXML = <Icon component={SvgXML} />;
  const svgShare = <Icon component={SvgShare} />;

  const [showPropertiesPanel, setShowPropertiesPanel] = useState(false);
  const [showProcessExportModal, setShowProcessExportModal] = useState(false);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const modeler = useModelerStateStore((state) => state.modeler);
  const editingDisabled = useModelerStateStore((state) => state.editingDisabled);
  const selectedElementId = useModelerStateStore((state) => state.selectedElementId);

  const { processId } = useParams();

  const invalidateVersions = useInvalidateAsset('/process/{definitionId}/versions', {
    params: { path: { definitionId: processId as string } },
  });

  const invalidateProcesses = useInvalidateAsset('/process/{definitionId}', {
    params: { path: { definitionId: processId as string } },
  });

  // const [index, setIndex] = useState(0);

  let selectedElement;

  if (modeler) {
    const elementRegistry = modeler.get('elementRegistry') as ElementRegistry;

    selectedElement = selectedElementId
      ? elementRegistry.get(selectedElementId)!
      : elementRegistry.getAll().filter((el) => el.businessObject.$type === 'bpmn:Process')[0];
  }

  useEffect(() => {
    if (modeler) {
      const commandStack = modeler.get('commandStack', false) as CommandStack;
      // check if there is a commandStack (does not exist on the viewer used when editing is disabled)
      if (commandStack) {
        // init canUndo and canRedo
        setCanUndo(commandStack.canUndo());
        setCanRedo(commandStack.canRedo());
      }
      modeler.on('commandStack.changed', () => {
        // update canUndo and canRedo when the state of the modelers commandStack changes
        setCanUndo(commandStack.canUndo());
        setCanRedo(commandStack.canRedo());
      });
    }
  }, [modeler]);

  const createProcessVersion = async (values: {
    versionName: string;
    versionDescription: string;
  }) => {
    const saveXMLResult = await modeler?.saveXML({ format: true });

    if (saveXMLResult?.xml) {
      await createNewProcessVersion(
        saveXMLResult.xml,
        values.versionName,
        values.versionDescription,
      );
      await invalidateVersions();
      await invalidateProcesses();
    }
  };
  const handlePropertiesPanelToggle = () => {
    setShowPropertiesPanel(!showPropertiesPanel);
  };

  const handleProcessExportModalToggle = async () => {
    setShowProcessExportModal(!showProcessExportModal);
  };

  const selectedVersion = useSearchParams().get('version');

  const handleUndo = () => {
    if (modeler) (modeler.get('commandStack') as CommandStack).undo();
  };

  const handleRedo = () => {
    if (modeler) (modeler.get('commandStack') as CommandStack).redo();
  };

  return (
    <>
      <Toolbar>
        <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
          {!editingDisabled && modeler ? (
            <ToolbarGroup>
              <Tooltip title="Undo">
                <Button icon={<UndoOutlined />} onClick={handleUndo} disabled={!canUndo}></Button>
              </Tooltip>
              <Tooltip title="Redo">
                <Button icon={<RedoOutlined />} onClick={handleRedo} disabled={!canRedo}></Button>
              </Tooltip>
            </ToolbarGroup>
          ) : (
            <div></div>
          )}
          <ToolbarGroup>
            {/* <Button>Test</Button>
              <Button
                icon={showPropertiesPanel ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                onClick={handlePropertiesPanelToggle}
              /> */}
            <Tooltip title="Show XML">
              <Button icon={svgXML} onClick={onOpenXmlEditor}></Button>
            </Tooltip>
            <Tooltip title="Export">
              <Button icon={<ExportOutlined />} onClick={handleProcessExportModalToggle}></Button>
            </Tooltip>
            <Tooltip
              title={showPropertiesPanel ? 'Close Properties Panel' : 'Open Properties Panel'}
            >
              <Button icon={<SettingOutlined />} onClick={handlePropertiesPanelToggle}></Button>
            </Tooltip>
            <Tooltip title="Create New Version">
              <VersionCreationButton
                icon={<PlusOutlined />}
                createVersion={createProcessVersion}
              ></VersionCreationButton>
            </Tooltip>
          </ToolbarGroup>
        </Space>
        {showPropertiesPanel && selectedElement && (
          <PropertiesPanel selectedElement={selectedElement} />
        )}
      </Toolbar>
      <ProcessExportModal
        processes={
          showProcessExportModal
            ? [{ definitionId: processId as string, processVersion: selectedVersion || undefined }]
            : []
        }
        onClose={() => setShowProcessExportModal(false)}
      />
    </>
  );
};

export default ModelerToolbar;
