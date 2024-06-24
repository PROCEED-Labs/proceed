import React, { useMemo, useState } from 'react';
import { is as bpmnIs } from 'bpmn-js/lib/util/ModelUtil';
import { Tooltip, Button, Space } from 'antd';
import { Toolbar, ToolbarGroup } from '@/components/toolbar';
import styles from '../../../(dashboard)/[environmentId]/processes/[processId]/modeler-toolbar.module.scss';
import { InfoCircleOutlined, UndoOutlined, RedoOutlined, ArrowUpOutlined } from '@ant-design/icons';
import PropertiesPanel from '../../../(dashboard)/[environmentId]/processes/[processId]/properties-panel';
import useModelerStateStore from '../../../(dashboard)/[environmentId]/processes/[processId]/use-modeler-state-store';
import { useSearchParams } from 'next/navigation';
import { Root } from 'bpmn-js/lib/model/Types';
import { useAddControlCallback } from '@/lib/controls-store';

type ModelerToolbarProps = {
  canUndo: boolean;
  canRedo: boolean;
  viewOnly?: boolean;
};
const ModelerToolbar = ({ canUndo, canRedo, viewOnly = false }: ModelerToolbarProps) => {
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(false);

  const modeler = useModelerStateStore((state) => state.modeler);
  const selectedElementId = useModelerStateStore((state) => state.selectedElementId);
  const selectedElement = useMemo(() => {
    if (modeler) {
      return selectedElementId ? modeler.getElement(selectedElementId) : modeler.getCurrentRoot();
    }
  }, [modeler, selectedElementId]);

  const currentRoot = modeler && modeler.getCurrentRoot();
  console.log('currentrott', currentRoot);
  const subprocessId = currentRoot && bpmnIs(currentRoot, 'bpmn:SubProcess') && currentRoot.id;
  console.log('subprocessid', subprocessId);

  const handlePropertiesPanelToggle = () => {
    setShowPropertiesPanel(!showPropertiesPanel);
  };
  useAddControlCallback('modeler', 'control+enter', () => {
    setShowPropertiesPanel(true); /* This does not cause rerenders if it is already set to true */
  });
  useAddControlCallback('modeler', 'esc', () => {
    setShowPropertiesPanel(false);
  });

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
            <Tooltip title="Back to parent">
              <Button
                icon={<ArrowUpOutlined />}
                disabled={!subprocessId}
                onClick={handleReturnToParent}
              />
            </Tooltip>
            {!viewOnly && (
              <>
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
            {selectedElement &&
              bpmnIs(selectedElement, 'bpmn:SubProcess') &&
              currentRoot?.id !== selectedElement.id &&
              selectedElement.collapsed && (
                <Tooltip title="Open Subprocess">
                  <Button style={{ fontSize: '0.875rem' }} onClick={handleOpeningSubprocess}>
                    Open Subprocess
                  </Button>
                </Tooltip>
              )}
          </ToolbarGroup>

          {!viewOnly && (
            <Space style={{ height: '3rem' }}>
              <ToolbarGroup>
                <Tooltip
                  title={showPropertiesPanel ? 'Close Properties Panel' : 'Open Properties Panel'}
                >
                  <Button
                    icon={<InfoCircleOutlined />}
                    onClick={handlePropertiesPanelToggle}
                  ></Button>
                </Tooltip>
              </ToolbarGroup>

              {showPropertiesPanel && selectedElement && (
                <PropertiesPanel
                  isOpen={showPropertiesPanel}
                  close={handlePropertiesPanelToggle}
                  selectedElement={selectedElement}
                />
              )}
            </Space>
          )}
        </Space>
      </Toolbar>
    </>
  );
};

export default ModelerToolbar;
