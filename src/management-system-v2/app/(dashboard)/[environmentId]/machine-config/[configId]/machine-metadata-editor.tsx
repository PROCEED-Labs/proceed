'use client';

import { ConfigParameter, ParentConfig } from '@/lib/data/machine-config-schema';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  PlusOutlined,
  MinusOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  ArrowUpOutlined,
  EditOutlined,
  KeyOutlined,
  UserOutlined,
  DeleteOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import TextArea from 'antd/es/input/TextArea';
import { useEffect, useRef, useState } from 'react';
import {
  Button,
  Input,
  Select,
  Space,
  Divider,
  Col,
  Row,
  Tag,
  Tooltip,
  Layout,
  SelectProps,
  theme,
  Card,
} from 'antd';
import { ToolbarGroup } from '@/components/toolbar';
import VersionCreationButton from '@/components/version-creation-button';
import { spaceURL } from '@/lib/utils';
import useMobileModeler from '@/lib/useMobileModeler';
import { useEnvironment } from '@/components/auth-can';
import { TreeFindStruct, defaultConfiguration, findConfig } from './machine-tree-view';
import { Content, Header } from 'antd/es/layout/layout';
import Title from 'antd/es/typography/Title';
import { isIPv4 } from 'net';
import { v4 } from 'uuid';

type MachineDataViewProps = {
  configId: string;
  selectedConfig: TreeFindStruct;
  parentConfig: ParentConfig;
  backendSaveConfig: Function;
};

const LATEST_VERSION = { version: -1, name: 'Latest Version', description: '' };

export default function MachineDataEditor(props: MachineDataViewProps) {
  const router = useRouter();
  const environment = useEnvironment();
  const query = useSearchParams();

  const firstRender = useRef(true);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState<string | undefined>('');
  const [description, setDescription] = useState<string | undefined>('');

  const parentConfig = { ...props.parentConfig };
  const date = new Date().toUTCString();
  const editingConfig = props.selectedConfig
    ? { ...props.selectedConfig.selection }
    : defaultConfiguration();
  let refEditingMachineConfig = findConfig(editingConfig.id, parentConfig);
  const saveConfig = props.backendSaveConfig;
  const configId = props.configId;
  const selectedVersionId = query.get('version');
  const [nestedParameters, setNestedParameters] = useState<ConfigParameter[]>([]); // State for nested parameters

  //Added by Antoni
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();
  const addNestedParameter = () => {
    setNestedParameters([
      ...nestedParameters,
      {
        id: v4(),
        key: '',
        value: '',
        unit: '',
        language: '',
        linkedParameters: [],
        nestedParameters: [],
        createdBy: environment.spaceId,
        createdOn: date,
        lastEditedBy: environment.spaceId,
        lastEditedOn: date,
      },
    ]);
  };

  const changeNestedParameter = (index: number, key: string, value: string) => {
    const newNestedParameters = [...nestedParameters];
    if (key === 'key') newNestedParameters[index].key = value;
    else if (key === 'value') newNestedParameters[index].value = value;
    else if (key === 'unit') newNestedParameters[index].unit = value;
    else if (key === 'language') newNestedParameters[index].language = value;
    setNestedParameters(newNestedParameters);
  };

  const saveParameters = () => {
    if (refEditingMachineConfig) {
      refEditingMachineConfig.selection.parameters = nestedParameters;
      saveConfig(configId, parentConfig).then(() => {});
      router.refresh();
    }
  };

  const removeNestedParameter = (index: number) => {
    setNestedParameters(nestedParameters.filter((_, i) => i !== index));
  };
  ////

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

  const changeName = (e: any) => {
    let newName = e.target.value;
    setName(newName);
  };

  const saveName = (e: any) => {
    if (editingName) {
      if (refEditingMachineConfig) {
        refEditingMachineConfig.selection.name = name ? name : '';
        saveConfig(configId, parentConfig).then(() => {});
        router.refresh();
      }
    }
  };

  const changeDescription = (e: any) => {
    let newDescription = e.target.value;
    setDescription(newDescription);
  };

  const saveDescription = (e: any) => {
    if (refEditingMachineConfig && refEditingMachineConfig.selection.description) {
      refEditingMachineConfig.selection.description.value = description ? description : '';
      saveConfig(configId, parentConfig).then(() => {});
      router.refresh();
    }
  };

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setName(editingConfig.name);
    setDescription(editingConfig.description?.value);
    if (refEditingMachineConfig) setNestedParameters(refEditingMachineConfig.selection.parameters);
  }, [props.selectedConfig]);

  const showMobileView = useMobileModeler();

  const toggleEditingName = () => {
    // if (editingName) {
    //   saveMachineConfig(configId, rootMachineConfig).then(() => {});
    // }
    setEditingName(!editingName);
  };
  return (
    <Layout>
      <Header
        style={{ background: '#fff', padding: '0 16px', display: 'flex', alignItems: 'center' }}
      >
        <Divider orientation="left" style={{ margin: '0 16px' }}>
          <Title level={3} style={{ margin: 0 }}>
            {editingConfig.type === 'machine-config' ? (
              <Tag color="red">Machine</Tag>
            ) : editingConfig.type === 'target-config' ? (
              <Tag color="purple">Target</Tag>
            ) : (
              ''
            )}
            &nbsp;Configuration&nbsp;
            {!editingName ? (
              <>{editingConfig.name}</>
            ) : (
              <Input value={name} onChange={changeName} onBlur={saveName} />
            )}
            &nbsp;
            <Button>
              <EditOutlined onClick={toggleEditingName} />
            </Button>
            &nbsp;
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
              {!showMobileView && (
                <>
                  <Tooltip title="Create New Version">
                    <VersionCreationButton
                      icon={<PlusOutlined />}
                      createVersion={createConfigVersion}
                    ></VersionCreationButton>
                  </Tooltip>
                  <Tooltip title="Back to parent">
                    <Button icon={<ArrowUpOutlined />} disabled={true} />
                  </Tooltip>
                </>
              )}
            </ToolbarGroup>
          </Title>
        </Divider>
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
        <Card title="Metadata" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              {parentConfig.id !== editingConfig.id ? (
                <>
                  Parent:
                  <Input value={parentConfig.id} disabled prefix={<KeyOutlined />} />
                </>
              ) : (
                ''
              )}
              ID:
              <Input value={editingConfig.id} disabled prefix={<KeyOutlined />} />
              Owner:
              <Input
                value={editingConfig.owner?.value?.split('|').pop()}
                disabled
                prefix={<UserOutlined />}
              />
            </Col>
            <Col span={8}>
              <label>
                Description:
                <TextArea
                  value={description}
                  onChange={changeDescription}
                  onBlur={saveDescription}
                />
              </label>
            </Col>
          </Row>
          <Title level={5}>Linked Machine Configurations</Title>
          <Space wrap>
            <Tag color="green">ID ABC</Tag>
            <Tag color="purple">ID XYZ</Tag>
            <Tag color="magenta">ID LMN</Tag>
            <Button icon={<PlusOutlined />} type="dashed" />
          </Space>
        </Card>
        <Row gutter={16} style={{ marginTop: '16px' }}>
          <Col span={24}>
            <Card title="Parameters" bodyStyle={{ paddingBottom: 16 }}>
              <Button
                icon={<PlusOutlined />}
                type="dashed"
                style={{ width: '100%', marginBottom: 16 }}
                onClick={addNestedParameter}
              >
                Add Parameter
              </Button>
              {nestedParameters.map((param, i) => (
                <Card
                  key={i}
                  type="inner"
                  title={`Nested Parameter ${i + 1}`}
                  extra={
                    <Button
                      icon={<MinusOutlined />}
                      type="dashed"
                      onClick={() => removeNestedParameter(i)}
                    />
                  }
                  style={{ marginBottom: 16 }}
                >
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={6}>
                      <Input
                        placeholder="Key"
                        value={param.key}
                        onChange={(e) => changeNestedParameter(i, 'key', e.target.value)}
                        onBlur={saveParameters}
                      />
                    </Col>
                    <Col span={6}>
                      <Input
                        placeholder="Value"
                        value={param.value}
                        onChange={(e) => changeNestedParameter(i, 'value', e.target.value)}
                        onBlur={saveParameters}
                      />
                    </Col>
                    <Col span={6}>
                      <Input
                        placeholder="Unit"
                        value={param.unit}
                        onChange={(e) => changeNestedParameter(i, 'unit', e.target.value)}
                        onBlur={saveParameters}
                      />
                    </Col>
                    <Col span={6}>
                      <Input
                        placeholder="Language"
                        value={param.language}
                        onChange={(e) => changeNestedParameter(i, 'language', e.target.value)}
                        onBlur={saveParameters}
                      />
                    </Col>
                  </Row>
                  <Row gutter={16} style={{ marginBottom: 16 }}>
                    <Col span={24}>
                      <Space>
                        <Tag color="purple">Key XY</Tag>
                        <Tag color="blue">Key AB</Tag>
                        <Button icon={<PlusOutlined />} type="dashed" />
                      </Space>
                    </Col>
                  </Row>
                  <Row gutter={16} justify="start">
                    <Space>
                      <Tooltip title="Copy">
                        <Button icon={<CopyOutlined />} shape="circle" />
                      </Tooltip>
                      <Tooltip title="Edit">
                        <Button icon={<EditOutlined />} shape="circle" />
                      </Tooltip>
                      <Tooltip title="Delete">
                        <Button icon={<DeleteOutlined />} shape="circle" />
                      </Tooltip>
                    </Space>
                    <Button type="link" icon={<PlusOutlined />}>
                      Create Custom Parameter
                    </Button>
                  </Row>
                </Card>
              ))}
            </Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
}
