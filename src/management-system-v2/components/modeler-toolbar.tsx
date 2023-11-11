'use client';

import React, { useState } from 'react';

import type ElementRegistry from 'diagram-js/lib/core/ElementRegistry';

import { Row, Col, Tooltip, Button } from 'antd';
import { Toolbar, ToolbarGroup } from './toolbar';

import Icon, {
  FormOutlined,
  ExportOutlined,
  EyeOutlined,
  SettingOutlined,
  PlusOutlined,
} from '@ant-design/icons';

import { SvgXML, SvgShare } from '@/components/svg';

import PropertiesPanel from './properties-panel';

import useModelerStateStore from '@/lib/use-modeler-state-store';
import { useParams, useSearchParams } from 'next/navigation';

import ProcessExportModal from './process-export';

import { createNewProcessVersion } from '@/lib/helpers/processVersioning';
import VersionCreationButton from './version-creation-button';
import { useQueryClient } from '@tanstack/react-query';
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

  const modeler = useModelerStateStore((state) => state.modeler);
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

  return (
    <>
      <Toolbar>
        <Row justify="end">
          <Col>
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
            {showPropertiesPanel && <div style={{ width: '650px' }}></div>}
          </Col>
          {/* {showPropertiesPanel && <Col></Col>} */}
          {showPropertiesPanel && selectedElement && (
            <>
              <PropertiesPanel selectedElement={selectedElement} setOpen={setShowPropertiesPanel} />
            </>
          )}
        </Row>
      </Toolbar>
      {/* {showPropertiesPanel && selectedElement && (
        <PropertiesPanel selectedElement={selectedElement} setOpen={setShowPropertiesPanel} />
      )} */}
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
