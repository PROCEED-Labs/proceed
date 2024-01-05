'use client';

import React, { useEffect, useState } from 'react';

import type ElementRegistry from 'diagram-js/lib/core/ElementRegistry';
import type CommandStack from 'diagram-js/lib/command/CommandStack';
import type Selection from 'diagram-js/lib/features/selection/Selection';
import type Canvas from 'diagram-js/lib/core/Canvas';

import { is as bpmnIs } from 'bpmn-js/lib/util/ModelUtil';

import { Tooltip, Button, Space, Select, SelectProps } from 'antd';
import { Toolbar, ToolbarGroup } from './toolbar';

import styles from './modeler-toolbar.module.scss';

import Icon, {
  ExportOutlined,
  SettingOutlined,
  PlusOutlined,
  UndoOutlined,
  RedoOutlined,
  ArrowUpOutlined,
} from '@ant-design/icons';

import { SvgXML } from '@/components/svg';

import PropertiesPanel from './properties-panel';

import useModelerStateStore from '@/lib/use-modeler-state-store';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

import ProcessExportModal from './process-export';

import { createNewProcessVersion } from '@/lib/helpers/processVersioning';
import VersionCreationButton from './version-creation-button';

import { useInvalidateAsset } from '@/lib/fetch-data';

import useMobileModeler from '@/lib/useMobileModeler';

const LATEST_VERSION = { version: -1, name: 'Latest Version', description: '' };

type ModelerToolbarProps = {
  onOpenXmlEditor: () => void;
  versions: { version: number; name: string; description: string }[];
};
const ModelerToolbar: React.FC<ModelerToolbarProps> = ({ onOpenXmlEditor, versions }) => {
  /* ICONS: */
  const svgXML = <Icon component={SvgXML} />;

  const router = useRouter();

  const [showPropertiesPanel, setShowPropertiesPanel] = useState(false);
  const [showProcessExportModal, setShowProcessExportModal] = useState(false);
  const [elementsSelectedForExport, setElementsSelectedForExport] = useState<string[]>([]);
  const [rootLayerIdForExport, setRootLayerIdForExport] = useState<string | undefined>(undefined);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

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
      : elementRegistry.getAll().filter((el) => el.businessObject?.$type === 'bpmn:Process')[0];
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
    if (!showProcessExportModal && modeler?.get) {
      // provide additional information for the export that is used if the user decides to only export selected elements (also controls if the option is given in the first place)
      const selectedElementIds = (modeler.get('selection') as Selection).get().map(({ id }) => id);
      setElementsSelectedForExport(selectedElementIds);
      // provide additional information for the export so only the parts of the process that can be reached from the currently open layer are exported
      const currentRootElement = (modeler.get('canvas') as Canvas).getRootElement();
      setRootLayerIdForExport(
        bpmnIs(currentRootElement, 'bpmn:SubProcess')
          ? currentRootElement.businessObject?.id
          : undefined,
      );
    } else {
      setElementsSelectedForExport([]);
      setRootLayerIdForExport(undefined);
    }

    setShowProcessExportModal(!showProcessExportModal);
  };

  const query = useSearchParams();
  const selectedVersionId = query.get('version');
  const subprocessId = query.get('subprocess');

  const handleUndo = () => {
    if (modeler) (modeler.get('commandStack') as CommandStack).undo();
  };

  const handleRedo = () => {
    if (modeler) (modeler.get('commandStack') as CommandStack).redo();
  };

  const handleReturnToParent = async () => {
    if (modeler) {
      const canvas = modeler.get('canvas') as any;

      canvas.setRootElement(canvas.findRoot(subprocessId));
      canvas.zoom('fit-viewport', 'auto');
    }
  };

  const filterOption: SelectProps['filterOption'] = (input, option) =>
    ((option?.label as string) ?? '').toLowerCase().includes(input.toLowerCase());

  const selectedVersion =
    versions.find((version) => version.version === parseInt(selectedVersionId ?? '-1')) ??
    LATEST_VERSION;

  const showMobileView = useMobileModeler();

  return (
    <>
      <Toolbar className={styles.Toolbar}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }} wrap>
          <ToolbarGroup>
            <Select
              popupMatchSelectWidth={false}
              placeholder="Select Version"
              showSearch
              filterOption={filterOption}
              value={{
                value: selectedVersion.version,
                label: selectedVersion.name,
              }}
              onSelect={(_, option) => {
                // change the version info in the query but keep other info (e.g. the currently open subprocess)
                const searchParams = new URLSearchParams(query);
                if (!option.value || option.value === -1) searchParams.delete('version');
                else searchParams.set(`version`, `${option.value}`);
                router.push(
                  `/processes/${processId as string}${
                    searchParams.size ? '?' + searchParams.toString() : ''
                  }`,
                );
              }}
              options={[LATEST_VERSION].concat(versions ?? []).map(({ version, name }) => ({
                value: version,
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
            <Tooltip
              title={showPropertiesPanel ? 'Close Properties Panel' : 'Open Properties Panel'}
            >
              <Button icon={<SettingOutlined />} onClick={handlePropertiesPanelToggle}></Button>
            </Tooltip>
            {!showMobileView && (
              <>
                <Tooltip title="Show XML">
                  <Button icon={svgXML} onClick={onOpenXmlEditor}></Button>
                </Tooltip>
                <Tooltip title="Export">
                  <Button
                    icon={<ExportOutlined />}
                    onClick={handleProcessExportModalToggle}
                  ></Button>
                </Tooltip>
              </>
            )}
          </ToolbarGroup>
        </Space>
        {showPropertiesPanel && selectedElement && (
          <PropertiesPanel selectedElement={selectedElement} />
        )}
      </Toolbar>
      <ProcessExportModal
        open={showProcessExportModal}
        processes={
          showProcessExportModal
            ? [
                {
                  definitionId: processId as string,
                  processVersion: selectedVersionId || undefined,
                },
              ]
            : []
        }
        onClose={() => setShowProcessExportModal(false)}
        giveSelectionOption={!!elementsSelectedForExport.length}
      />
    </>
  );
};

export default ModelerToolbar;
