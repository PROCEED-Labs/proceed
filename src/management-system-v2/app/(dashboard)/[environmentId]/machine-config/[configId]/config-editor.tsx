'use client';

import { ParentConfig } from '@/lib/data/machine-config-schema';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  PlusOutlined,
  CheckOutlined,
  EditOutlined,
  EyeOutlined,
  ExportOutlined,
  CaretRightOutlined,
  CopyOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';
import {
  Button,
  Space,
  Tooltip,
  SelectProps,
  theme,
  Layout,
  Flex,
  Select,
  Radio,
  Collapse,
} from 'antd';

import useMobileModeler from '@/lib/useMobileModeler';
import { useEnvironment } from '@/components/auth-can';
import { TreeFindStruct, defaultConfiguration, findConfig } from './machine-tree-view';
import MachineConfigurations from './mach-config';
import TargetConfiguration from './target-config';
import Text from 'antd/es/typography/Text';
import MetaData from './metadata';
import { Content, Header } from 'antd/es/layout/layout';
import Title from 'antd/es/typography/Title';
import { ToolbarGroup } from '@/components/toolbar';
import { spaceURL } from '@/lib/utils';
import VersionCreationButton from '@/components/version-creation-button';
import getConfigHeader from './config-header';
import getAddButton from './add-button';
import getTooltips from './getTooltips';

type MachineDataViewProps = {
  configId: string;
  selectedConfig: TreeFindStruct;
  parentConfig: ParentConfig;
  backendSaveParentConfig: Function;
};

const LATEST_VERSION = { version: -1, name: 'Latest Version', description: '' };

export default function ConfigEditor(props: MachineDataViewProps) {
  const router = useRouter();
  const environment = useEnvironment();
  const query = useSearchParams();

  const firstRender = useRef(true);
  const [collapseItems, setCollapseItems] = useState<any[]>([]);
  const [name, setName] = useState<string | undefined>('');
  const [oldName, setOldName] = useState<string | undefined>('');
  const [description, setDescription] = useState<string | undefined>('');

  const parentConfig = { ...props.parentConfig };
  const editingConfig = props.selectedConfig
    ? { ...props.selectedConfig.selection }
    : defaultConfiguration();
  let refEditingConfig = findConfig(editingConfig.id, parentConfig);
  const saveParentConfig = props.backendSaveParentConfig;
  const configId = props.configId;
  const selectedVersionId = query.get('version');

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const selectedVersion =
    editingConfig.versions.find(
      (version) => version.version === parseInt(selectedVersionId ?? '-1'),
    ) ?? LATEST_VERSION;
  const filterOption: SelectProps['filterOption'] = (input, option) =>
    ((option?.label as string) ?? '').toLowerCase().includes(input.toLowerCase());

  const createConfigVersion = async (values: {
    versionName: string;
    versionDescription: string;
  }) => {
    console.log(values.versionName, values.versionDescription);
    router.refresh();
  };

  const pushName = () => {
    setOldName(name);
  };

  const restoreName = () => {
    setName(oldName);
  };

  const saveName = () => {
    if (refEditingConfig) {
      refEditingConfig.selection.name = name ? name : '';
      saveParentConfig(configId, parentConfig).then(() => {});
      router.refresh();
    }
  };

  const [editable, setEditable] = useState(false); //change back to false
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setName(editingConfig.name);
    setDescription(editingConfig.description?.value);
    updateItems(panelStyle);
  }, [props.selectedConfig, props.parentConfig, editable]);

  const showMobileView = useMobileModeler();

  const [position, setPosition] = useState('view');
  const onModeChange = (e: any) => {
    setPosition(e.target.value);
    setEditable(e.target.value === 'edit'); //alternative: !editable
    router.refresh();
  };

  const { token } = theme.useToken();
  const panelStyle = {
    marginBottom: 16,
    background: token.colorFillAlter,
    borderRadius: token.borderRadiusLG,
    border: 'none',
  };

  //for target header and metadata header
  const subHeaderDropdownItems = [
    {
      key: '1',
      label: 'Custom Field',
    },
    {
      key: '2',
      label: 'Attachment',
    },
    {
      key: '3',
      label: 'Picture',
    },
    {
      key: '4',
      label: 'ID',
    },
    {
      key: '5',
      label: 'Owner',
    },
    {
      key: '6',
      label: 'Description',
    },
  ];

  const configHeaderDropdownItems = [
    {
      key: '1',
      label: 'Target Configuration',
    },
    {
      key: '2',
      label: 'Machine Configuration',
    },
  ];

  const updateItems = (panelStyle: {
    marginBottom: number;
    background: string;
    borderRadius: number;
    border: string;
  }) => {
    let panels = [];
    panels.push({
      key: '1',
      label:
        'Metadata' /* getConfigHeader('Metadata', subHeaderDropdownItems, editable, false, false, false), */,
      children: (
        <MetaData
          backendSaveMachineConfig={saveParentConfig}
          configId={configId}
          rootMachineConfig={parentConfig}
          selectedMachineConfig={props.selectedConfig}
          editingEnabled={editable}
        />
      ),
      extra: getTooltips(editable, true, true, false),
      style: panelStyle,
    });
    if (editingConfig.type === 'config') {
      const currentConfig = editingConfig as ParentConfig;
      if (currentConfig.targetConfig) {
        let title = 'Target Configuration: ' + currentConfig.targetConfig.name;
        panels.push({
          key: '2',
          label: title /* getConfigHeader(title, subHeaderDropdownItems, editable) */,
          children: (
            <TargetConfiguration
              backendSaveParentConfig={saveParentConfig}
              configId={configId}
              parentConfig={parentConfig}
              selectedConfig={props.selectedConfig}
              editingEnabled={editable}
            />
          ),
          extra: getTooltips(editable, true, true, editable),
          style: panelStyle,
        });
      }
      if (currentConfig.machineConfigs && currentConfig.machineConfigs.length > 0) {
        const label = (
          <Space.Compact size="small">
            <Space align="center">
              <text>Machine Configurations</text>
              {editable && (
                <Tooltip title="Add Machine Configuration">
                  <Button icon={<PlusOutlined />} type="text" style={{ margin: '0 10px 0 10px' }} />
                </Tooltip>
              )}
            </Space>
          </Space.Compact>
        );
        panels.push({
          key: '3',
          label: label /* getConfigHeader('Machine Configurations', [], editable, false) */,
          children: (
            <MachineConfigurations
              backendSaveParentConfig={saveParentConfig}
              configId={configId}
              parentConfig={parentConfig}
              selectedConfig={props.selectedConfig}
              editingEnabled={editable}
            />
          ),
          /* extra: editable && (
            <Tooltip title="Add Machine Configuration">
              <Button icon={<PlusOutlined />} type="text" style={{ margin: '0 0 0 10px' }} />
            </Tooltip>
          ), */
          style: panelStyle,
        });
      }
    }
    setCollapseItems(panels);
  };

  return (
    <Layout>
      <Header
        style={{
          background: '#fff',
          margin: '0 16px',
          padding: '0 16px',
          borderRadius: borderRadiusLG,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Flex align="center" justify="space-between" style={{ width: '100%' }}>
          <Space>
            <div onBlur={saveName}>
              <Title
                editable={{
                  icon: (
                    <EditOutlined
                      style={{
                        margin: '0 10px',
                      }}
                    />
                  ),
                  tooltip: 'Edit',
                  onStart: pushName,
                  onCancel: restoreName,
                  onChange: setName,
                  onEnd: saveName,
                  enterIcon: <CheckOutlined />,
                }}
                level={5}
                style={{ margin: '0' }}
              >
                {name}
              </Title>
            </div>
            <Space.Compact>
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
                  // change the version info in the query but keep other info
                  const searchParams = new URLSearchParams(query);
                  if (!option.value || option.value === -1) searchParams.delete('version');
                  else searchParams.set(`version`, `${option.value}`);
                  router.push(
                    spaceURL(
                      environment,
                      `/machine-config/${configId as string}${
                        searchParams.size ? '?' + searchParams.toString() : ''
                      }`,
                    ),
                  );
                }}
                options={[LATEST_VERSION]
                  .concat(editingConfig.versions ?? [])
                  .map(({ version, name }) => ({
                    value: version,
                    label: name,
                  }))}
              />
              {!showMobileView && editable && (
                <>
                  <Tooltip title="Create New Version">
                    <VersionCreationButton
                      icon={<PlusOutlined />}
                      createVersion={createConfigVersion}
                    ></VersionCreationButton>
                  </Tooltip>
                </>
              )}
            </Space.Compact>
          </Space>
          <Space>
            {editable && getAddButton('Add Child Configuration', configHeaderDropdownItems)}
          </Space>
          <Space>
            <Radio.Group value={position} onChange={onModeChange}>
              <Radio.Button value="view">
                View{' '}
                <EyeOutlined
                  style={{
                    margin: '0 0 0 6px',
                  }}
                />
              </Radio.Button>
              <Radio.Button value="edit">
                Edit{' '}
                <EditOutlined
                  style={{
                    margin: '0 0 0 6px',
                  }}
                />
              </Radio.Button>
            </Radio.Group>
            <Button>
              Export{' '}
              <ExportOutlined
                style={{
                  margin: '0 0 0 16px',
                }}
              />
            </Button>
          </Space>
        </Flex>
      </Header>
      <Content
        style={{
          margin: '24px 16px 0',
          padding: '16px',
          background: colorBgContainer,
          borderRadius: borderRadiusLG,
          minHeight: 'auto',
          height: 'auto',
        }}
      >
        <Collapse
          bordered={false}
          defaultActiveKey={['1', '2', '3']}
          expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
          style={{
            background: token.colorBgContainer,
          }}
          items={collapseItems}
        />
      </Content>
    </Layout>
  );
}
