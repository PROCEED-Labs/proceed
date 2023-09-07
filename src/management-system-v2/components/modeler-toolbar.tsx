'use client';

import React, { useEffect, useState } from 'react';

import type ElementRegistry from 'diagram-js/lib/core/ElementRegistry';

import {
  Select,
  FloatButton,
  Row,
  Col,
  Space,
  Tooltip,
  Button,
  Dropdown,
  message,
  Badge,
} from 'antd';
import { Toolbar, ToolbarGroup } from './toolbar';
import type { MenuProps } from 'antd';

import Icon, {
  QuestionCircleOutlined,
  DownOutlined,
  FormOutlined,
  ExportOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  SettingOutlined,
  PlusOutlined,
  WarningOutlined,
} from '@ant-design/icons';

import { SvgXML, SvgShare } from '@/components/svg';

import PropertiesPanel from './properties-panel';

import useModelerStateStore from '@/lib/use-modeler-state-store';
import { useParams } from 'next/navigation';
import { useProcess } from '@/lib/process-queries';
import { MenuItemType } from 'antd/es/menu/hooks/useItems';

type ModelerToolbarProps = {};

const ModelerToolbar: React.FC<ModelerToolbarProps> = () => {
  /* ICONS: */
  const svgXML = <Icon component={SvgXML} />;
  const svgShare = <Icon component={SvgShare} />;

  const [showPropertiesPanel, setShowPropertiesPanel] = useState(false);

  const modeler = useModelerStateStore((state) => state.modeler);
  const selectedElementId = useModelerStateStore((state) => state.selectedElementId);
  const setSelectedVersion = useModelerStateStore((state) => state.setSelectedVersion);
  const versions = useModelerStateStore((state) => state.versions);
  const setVersions = useModelerStateStore((state) => state.setVersions);

  // const [index, setIndex] = useState(0);
  const { processId } = useParams();

  const { isSuccess, data: processData } = useProcess(processId);

  let selectedElement;

  if (modeler) {
    const elementRegistry = modeler.get('elementRegistry') as ElementRegistry;

    selectedElement = selectedElementId
      ? elementRegistry.get(selectedElementId)!
      : elementRegistry.getAll().filter((el) => el.businessObject.$type === 'bpmn:Process')[0];
  }

  const handlePropertiesPanelToggle = () => {
    setShowPropertiesPanel(!showPropertiesPanel);
  };

  let versionSelection: MenuItemType[] = [];

  useEffect(() => {
    if (isSuccess) {
      setVersions(processData.versions);
    }
  }, [isSuccess, processData, setVersions]);

  versionSelection = (
    versions as { version: number | string; name: string; description: string }[]
  ).map(({ version, name, description }) => ({
    key: version,
    label: name,
  }));

  versionSelection.unshift({ key: -1, label: 'Latest Version' });
  const handleVersionSelectionChange: MenuProps['onClick'] = (e) => {
    setSelectedVersion(+e.key < 0 ? null : +e.key);
    message.info(
      `Loading ${
        +e.key < 0
          ? versionSelection![0]?.label
          : versionSelection!.find((item) => item!.key == e?.key)?.label
      }...`,
    );
    // TODO:
    // const newIndex = versionSelection!.findIndex((item) => item!.key === +e.key);
    // setIndex(newIndex);
  };

  const menuProps = {
    items: versionSelection.map((e) => {
      return {
        key: `${e!.key}`,
        label: `${e!.label}`,
      };
    }),
    onClick: handleVersionSelectionChange,
  };

  const selectedVersion = useModelerStateStore((state) => state.selectedVersion);

  return (
    <>
      <Toolbar>
        <Row justify="space-between">
          <Col>
            <ToolbarGroup>
              {/*<Button>Test</Button>
              <Select
                defaultValue={-1}
                options={versionSelection}
                popupMatchSelectWidth={false}
                onChange={handleVersionSelectionChange}
  />*/}

              <Dropdown.Button icon={<DownOutlined />} menu={menuProps}>
                {/* {versionSelection[index].label} */}
                {versionSelection &&
                  (selectedVersion != null
                    ? versionSelection!.find((item) => item!.key == selectedVersion)?.label
                    : versionSelection[0].label)}
                {/* TODO: */}
              </Dropdown.Button>
            </ToolbarGroup>
          </Col>
          <Col>
            <ToolbarGroup>
              {/* <Button>Test</Button>
              <Button
                icon={showPropertiesPanel ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                onClick={handlePropertiesPanelToggle}
              /> */}
              <Tooltip title="Edit Process Constraints">
                <Button icon={<FormOutlined />}></Button>
              </Tooltip>
              <Tooltip title="Show XML">
                <Button icon={svgXML}></Button>
              </Tooltip>
              <Tooltip title="Export">
                <Button icon={<ExportOutlined />}></Button>
              </Tooltip>
              <Tooltip title="Hide Non-Executeable Elements">
                <Button icon={<EyeOutlined />}></Button>
              </Tooltip>
              <Tooltip
                title={showPropertiesPanel ? 'Close Properties Panel' : 'Open Properties Panel'}
              >
                <Button icon={<SettingOutlined />} onClick={handlePropertiesPanelToggle}></Button>
              </Tooltip>
              <Tooltip title="Share">
                <Button icon={svgShare}></Button>
              </Tooltip>
              <Tooltip title="Create New Version">
                <Button icon={<PlusOutlined />}></Button>
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
    </>
  );
};

export default ModelerToolbar;
