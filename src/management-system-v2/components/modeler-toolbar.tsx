'use client';

import React, { useState } from 'react';

import type ElementRegistry from 'diagram-js/lib/core/ElementRegistry';

import { Button, Select } from 'antd';
import { EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { useProcess } from '@/lib/process-queries';
import { Toolbar, ToolbarGroup } from './toolbar';

import PropertiesPanel from './properties-panel';

import useModelerStateStore from '@/lib/use-modeler-state-store';
import { useParams } from 'next/navigation';

type ModelerToolbarProps = {};

const ModelerToolbar: React.FC<ModelerToolbarProps> = () => {
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(false);

  const modeler = useModelerStateStore((state) => state.modeler);
  const selectedElementId = useModelerStateStore((state) => state.selectedElementId);
  const setSelectedVersion = useModelerStateStore((state) => state.setSelectedVersion);
  const { processId } = useParams();

  const { isSuccess, data: processData } = useProcess(processId);

  let selectedElement;

  if (modeler) {
    const elementRegistry = modeler.get('elementRegistry') as ElementRegistry;

    selectedElement = selectedElementId
      ? elementRegistry.get(selectedElementId)!
      : elementRegistry.getAll().filter((el) => el.businessObject.$type === 'bpmn:Process')[0];
  }

  const handleVersionSelectionChange = (value: number) => {
    setSelectedVersion(value);
  };

  const handlePropertiesPanelToggle = () => {
    setShowPropertiesPanel(!showPropertiesPanel);
  };

  let versionSelection: { value: number | string; label: string }[] = [];
  if (isSuccess) {
    versionSelection = processData.versions.map(({ version, name, description }) => ({
      value: version,
      label: name,
    }));
  }
  versionSelection.unshift({ value: -1, label: '(Latest Version)' });

  return (
    <>
      <Toolbar>
        <ToolbarGroup>
          <Button>Test</Button>
          <Select
            defaultValue={-1}
            options={versionSelection}
            popupMatchSelectWidth={false}
            onChange={handleVersionSelectionChange}
          />
        </ToolbarGroup>

        <ToolbarGroup>
          <Button>Test</Button>
          <Button
            icon={showPropertiesPanel ? <EyeOutlined /> : <EyeInvisibleOutlined />}
            onClick={handlePropertiesPanelToggle}
          />
        </ToolbarGroup>
      </Toolbar>
      {showPropertiesPanel && !!selectedElement && (
        <PropertiesPanel selectedElement={selectedElement} />
      )}
    </>
  );
};

export default ModelerToolbar;
