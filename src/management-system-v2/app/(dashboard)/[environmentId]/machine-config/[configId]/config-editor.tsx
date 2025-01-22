'use client';

import {
  AbstractConfig,
  MachineConfig,
  ParentConfig,
  TargetConfig,
} from '@/lib/data/machine-config-schema';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  PlusOutlined,
  CheckOutlined,
  EditOutlined,
  EyeOutlined,
  ExportOutlined,
  CaretRightOutlined,
} from '@ant-design/icons';
import { useEffect, useMemo, useRef, useState } from 'react';
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
  Typography,
} from 'antd';

import useMobileModeler from '@/lib/useMobileModeler';
import { useEnvironment } from '@/components/auth-can';
import {
  customMachineConfiguration,
  defaultMachineConfiguration,
  defaultTargetConfiguration,
} from '../configuration-helper';
import MachineConfigurations from './mach-config';
import TargetConfiguration from './target-config';
import Content_ from './config-content';
import { Content, Header } from 'antd/es/layout/layout';
import Title from 'antd/es/typography/Title';
import { spaceURL } from '@/lib/utils';
import VersionCreationButton from '@/components/version-creation-button';
import AddButton from './add-button';
import MachineConfigModal from '@/components/machine-config-modal';
import {
  addMachineConfig,
  addTargetConfig,
  updateMachineConfig,
  updateParentConfig,
  updateTargetConfig,
} from '@/lib/data/legacy/machine-config';
type MachineDataViewProps = {
  selectedConfig: AbstractConfig;
  parentConfig: ParentConfig;
  editable: boolean;
  onChangeEditable: (isEditable: boolean) => void;
};

const LATEST_VERSION = { version: -1, name: 'Latest Version', description: '' };

const ConfigEditor: React.FC<MachineDataViewProps> = ({
  selectedConfig,
  parentConfig,
  editable,
  onChangeEditable,
}) => {
  const router = useRouter();
  const environment = useEnvironment();
  const query = useSearchParams();

  const currentNameRef = useRef(selectedConfig.name);

  useEffect(() => {
    if (selectedConfig.name !== currentNameRef.current)
      currentNameRef.current = selectedConfig.name;
  }, [selectedConfig]);
  const restoreName = () => {
    currentNameRef.current = selectedConfig.name;
  };
  const saveName = async () => {
    if (!currentNameRef.current) return;
    if (selectedConfig.type === 'config') {
      await updateParentConfig(selectedConfig.id, { name: currentNameRef.current });
    } else if (selectedConfig.type === 'machine-config') {
      await updateMachineConfig(selectedConfig.id, { name: currentNameRef.current });
    } else {
      await updateTargetConfig(selectedConfig.id, { name: currentNameRef.current });
    }
    router.refresh();
  };

  const [createConfigType, setCreateConfigType] = useState<string>('');

  const selectedVersionId = query.get('version');

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const selectedVersion =
    selectedConfig.versions.find(
      (version: any) => version.version === parseInt(selectedVersionId ?? '-1'),
    ) ?? LATEST_VERSION;
  const filterOption: SelectProps['filterOption'] = (input, option) =>
    ((option?.label as string) ?? '').toLowerCase().includes(input.toLowerCase());

  // const createConfigVersion = async (values: {
  //   versionName: string;
  //   versionDescription: string;
  // }) => {
  //   selectedConfig.versions.push({
  //     version: selectedConfig.versions.length + 1,
  //     name: values.versionName,
  //     description: values.versionDescription,
  //     versionBasedOn: selectedConfig.versions.length,
  //   });
  //   await saveParentConfig(configId, parentConfig);
  //   router.refresh();
  // };

  const showMobileView = useMobileModeler();

  const { token } = theme.useToken();
  const panelStyle = {
    marginBottom: 16,
    background: token.colorFillAlter,
    borderRadius: token.borderRadiusLG,
    //border: 'none',
  };

  const configHeaderDropdownItems = useMemo(() => {
    const menu = [];
    if (parentConfig.targetConfig === undefined) {
      menu.push({
        key: 'target-config',
        label: 'Target Tech Data Set',
      });
    }
    menu.push({
      key: 'machine-config',
      label: 'Machine Tech Data Set',
    });
    return menu;
  }, [parentConfig]);

  const onClickAddConfigButton = (e: any) => {
    if (!e.key) return;
    if (e.key === 'target-config') {
      setCreateConfigType('target');
    } else if (e.key === 'machine-config') {
      setCreateConfigType('machine');
    }
  };

  const handleCreateConfig = async (
    values: {
      name: string;
      description: string;
      copyTarget: boolean;
    }[],
  ) => {
    const { name, description, copyTarget } = values[0];
    if (createConfigType === 'target') {
      await addTargetConfig(
        parentConfig.id,
        defaultTargetConfiguration(parentConfig.environmentId, name, description),
      );
    } else {
      if (copyTarget && parentConfig.targetConfig) {
        await addMachineConfig(
          parentConfig.id,
          customMachineConfiguration(
            parentConfig.environmentId,
            name,
            description,
            parentConfig.targetConfig,
          ),
          true,
        );
      } else {
        await addMachineConfig(
          parentConfig.id,
          defaultMachineConfiguration(parentConfig.environmentId, name, description),
        );
      }
    }
    setCreateConfigType('');
    router.refresh();
  };

  const exportCurrentConfig = () => {
    const blob = new Blob([JSON.stringify([selectedConfig], null, 2)], {
      type: 'application/json',
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `${selectedConfig.name}_export.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const collapseItems = useMemo(() => {
    let panels = [];
    panels.push({
      key: '1',
      label: 'Meta Data',
      children: (
        <Content_
          contentType="metadata"
          configId={selectedConfig.id}
          configType={selectedConfig.type === 'config' ? 'parent-config' : selectedConfig.type}
          parentConfig={parentConfig}
          shortname={selectedConfig.shortname}
          data={selectedConfig.metadata}
          categories={selectedConfig.categories}
          editingEnabled={editable}
        />
      ),
      /* extra: <Tooltip editable={editable} options={['copy', 'edit']} actions={...}/>, */ ///TODO
      style: { ...panelStyle, border: '1px solid #87e8de' }, //cyan-3
    });
    if (selectedConfig.type === 'config') {
      const currentConfig = selectedConfig as ParentConfig;
      if (currentConfig.targetConfig) {
        let title = 'Target Tech Data Set: ' + currentConfig.targetConfig.name;
        panels.push({
          key: '2',
          label: title,
          children: <TargetConfiguration parentConfig={parentConfig} editingEnabled={editable} />,
          /* extra:  <Tooltip editable={editable} options={['copy', 'edit', 'delete']} actions={...}/> */ //TODO
          style: { ...panelStyle, border: '1px solid #91caff' }, //blue-3
        });
      }
    } else if (
      selectedConfig.type === 'target-config' ||
      selectedConfig.type === 'machine-config'
    ) {
      const currentConfig = selectedConfig as TargetConfig | MachineConfig;
      panels.push({
        key: 'param',
        label: 'Parameters',
        children: [
          <Content_
            contentType="parameters"
            editingEnabled={editable}
            configId={currentConfig.id}
            configType={currentConfig.type}
            shortname={currentConfig.shortname}
            data={currentConfig.parameters}
            categories={[]}
            parentConfig={parentConfig}
          />,
        ],
        style: { ...panelStyle, border: '1px solid #b7eb8f' }, //green-3
      });
    }
    return panels;
  }, [editable, selectedConfig]);

  const machineConfigModalTitle =
    createConfigType === 'target' ? 'Create Target Tech Data Set' : 'Create Machine Tech Data Set';

  return (
    <>
      <Layout style={{ height: '100%' }}>
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
                  editable={
                    editable && {
                      icon: (
                        <EditOutlined
                          style={{ color: 'rgba(0, 0, 0, 0.88)', margin: '0 0 0 10px' }}
                        />
                      ),
                      tooltip: 'Edit Configuration Name',
                      onCancel: restoreName,
                      onChange: (newValue) => (currentNameRef.current = newValue),
                      onEnd: saveName,
                      enterIcon: <CheckOutlined />,
                    }
                  }
                  level={5}
                  style={{ margin: '0' }}
                >
                  {selectedConfig.name}
                </Title>
              </div>
              {/* <Space.Compact style={{ margin: '0 0 0 10px' }}>
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
                    .concat(selectedConfig.versions ?? [])
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
              </Space.Compact> */}
            </Space>

            <Space>
              {editable && (
                <AddButton
                  label="Add Tech Data Set"
                  items={configHeaderDropdownItems}
                  onClick={onClickAddConfigButton}
                />
              )}
            </Space>

            <Space>
              <Radio.Group
                value={editable ? 'edit' : 'view'}
                onChange={(e) => onChangeEditable(e.target.value === 'edit')}
              >
                <Radio.Button value="view">
                  View
                  <EyeOutlined
                    style={{
                      margin: '0 0 0 8px',
                    }}
                  />
                </Radio.Button>

                <Radio.Button value="edit">
                  Edit
                  <EditOutlined
                    style={{
                      margin: '0 0 0 8px',
                    }}
                  />
                </Radio.Button>
              </Radio.Group>

              <Button onClick={exportCurrentConfig}>
                Export
                <ExportOutlined
                  style={{
                    margin: '0 0 0 12px',
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
            overflow: 'auto',
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
          {selectedConfig.type === 'config' && (
            <MachineConfigurations parentConfig={parentConfig} editingEnabled={editable} />
          )}
        </Content>
      </Layout>

      <MachineConfigModal
        open={!!createConfigType}
        title={machineConfigModalTitle}
        onCancel={() => setCreateConfigType('')}
        onSubmit={handleCreateConfig}
        configType={createConfigType}
        targetConfigExists={!!parentConfig.targetConfig}
      />
    </>
  );
};
export default ConfigEditor;
