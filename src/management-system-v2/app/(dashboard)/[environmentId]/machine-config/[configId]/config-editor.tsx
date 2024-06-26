'use client';

import { ParentConfig } from '@/lib/data/machine-config-schema';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  PlusOutlined,
  ArrowUpOutlined,
  EditOutlined,
  CaretRightOutlined,
  CheckOutlined,
  ExportOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';
import {
  Button,
  Select,
  Space,
  Tooltip,
  Layout,
  SelectProps,
  Collapse,
  theme,
  Radio,
  Flex,
} from 'antd';
import { ToolbarGroup } from '@/components/toolbar';
import VersionCreationButton from '@/components/version-creation-button';
import { spaceURL } from '@/lib/utils';
import useMobileModeler from '@/lib/useMobileModeler';
import { useEnvironment } from '@/components/auth-can';
import { TreeFindStruct, defaultConfiguration, findConfig } from './machine-tree-view';
import { Content, Header } from 'antd/es/layout/layout';
import Title from 'antd/es/typography/Title';
import MetaData from './metadata';
import MachineConfigurations from './mach-config';
import TargetConfiguration from './target-config';
import Text from 'antd/es/typography/Text';

type MachineDataViewProps = {
  configId: string;
  selectedMachineConfig: { parent: ParentConfig; selection: ParentConfig } | undefined;
  rootMachineConfig: ParentConfig;
  backendSaveMachineConfig: Function;
};

const LATEST_VERSION = { version: -1, name: 'Latest Version', description: '' };

export default function ConfigEditor(props: MachineDataViewProps) {
  const router = useRouter();
  const environment = useEnvironment();
  const query = useSearchParams();

  const firstRender = useRef(true);
  const [name, setName] = useState<string | undefined>('');
  const [oldName, setOldName] = useState<string | undefined>('');
  const [description, setDescription] = useState<string | undefined>('');

  const rootMachineConfig = { ...props.rootMachineConfig };
  const parentMachineConfig = props.selectedMachineConfig
    ? { ...props.selectedMachineConfig.parent }
    : defaultConfiguration();
  const editingMachineConfig = props.selectedMachineConfig
    ? { ...props.selectedMachineConfig.selection }
    : defaultConfiguration();
  let refEditingMachineConfig = findConfig(editingMachineConfig.id, rootMachineConfig);
  const saveMachineConfig = props.backendSaveMachineConfig;
  const configId = props.configId;
  const selectedVersionId = query.get('version');

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const selectedVersion =
    editingMachineConfig.versions.find(
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
    if (refEditingMachineConfig) {
      refEditingMachineConfig.selection.name = name ? name : '';
      saveMachineConfig(configId, rootMachineConfig).then(() => {});
      router.refresh();
    }
  };

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setName(editingMachineConfig.name);
    setDescription(editingMachineConfig.description?.value);
  }, [props.selectedMachineConfig]);

  const showMobileView = useMobileModeler();

  const machConfigsHeader = (
    <Space.Compact block size="small">
      <Text>Machine Configurations</Text>
      <Tooltip title="Add Machine Configuration">
        <Button icon={<PlusOutlined />} type="text" style={{ margin: '0 16px' }} />
      </Tooltip>
    </Space.Compact>
  );

  const [position, setPosition] = useState('start');
  const onModeChange = (e: any) => {
    setPosition(e.target.value);
  };

  const { token } = theme.useToken();
  const panelStyle = {
    marginBottom: 24,
    background: token.colorFillAlter,
    borderRadius: token.borderRadiusLG,
    border: 'none',
  };

  const getItems = (panelStyle: {
    marginBottom: number;
    background: string;
    borderRadius: number;
    border: string;
  }) => [
    {
      key: '1',
      label: 'Meta Data',
      children: (
        <MetaData
          backendSaveMachineConfig={saveMachineConfig}
          configId={configId}
          rootMachineConfig={rootMachineConfig}
          selectedMachineConfig={props.selectedMachineConfig}
        />
      ),
      style: panelStyle,
    },
    {
      key: '2',
      label: 'Target Configuration',
      children: (
        <TargetConfiguration
          backendSaveMachineConfig={saveMachineConfig}
          configId={configId}
          rootMachineConfig={rootMachineConfig}
          selectedMachineConfig={props.selectedMachineConfig}
        />
      ),
      style: panelStyle,
    },
    {
      key: '3',
      label: machConfigsHeader,
      children: (
        <MachineConfigurations
          backendSaveMachineConfig={saveMachineConfig}
          configId={configId}
          rootMachineConfig={rootMachineConfig}
          selectedMachineConfig={props.selectedMachineConfig}
        />
      ),
      style: panelStyle,
    },
  ];

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
                  .concat(editingMachineConfig.versions ?? [])
                  .map(({ version, name }) => ({
                    value: version,
                    label: name,
                  }))}
              />
              {!showMobileView && (
                <>
                  <Tooltip title="Create New Version">
                    <VersionCreationButton
                      icon={<PlusOutlined />}
                      createVersion={createConfigVersion}
                    ></VersionCreationButton>
                  </Tooltip>
                  <Tooltip title="Back to Parent">
                    <Button icon={<ArrowUpOutlined />} disabled={true} />
                  </Tooltip>
                </>
              )}
            </ToolbarGroup>
          </Space>
          <Space>
            <Radio.Group value={position} onChange={onModeChange}>
              <Radio.Button value="start">
                View{' '}
                <EyeOutlined
                  style={{
                    margin: '0 0 0 6px',
                  }}
                />
              </Radio.Button>
              <Radio.Button value="end">
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
          defaultActiveKey={['1']}
          expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
          style={{
            background: token.colorBgContainer,
          }}
          items={getItems(panelStyle)}
        />
      </Content>
    </Layout>
  );
}
