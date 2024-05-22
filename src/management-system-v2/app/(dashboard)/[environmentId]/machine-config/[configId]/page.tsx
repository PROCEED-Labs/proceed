import Content from '@/components/content';
import { Space } from 'antd';
import { getCurrentEnvironment } from '@/components/auth';
//import styles from './page.module.scss';
import { getMachineConfigById } from '@/lib/data/legacy/machine-config';
//import { toCaslResource } from '@/lib/ability/caslAbility';
import { PlusOutlined } from '@ant-design/icons';
import { Breadcrumb, Input, Button, Form } from 'antd';
import { Col, Divider, Row } from 'antd';
import TextArea from 'antd/es/input/TextArea';
import { MachineConfig } from '@/lib/data/machine-config-schema';
import { userError } from '@/lib/user-error';

type MachineConfigProps = {
  params: { configId: string; environmentId: string };
  searchParams: { version?: string };
};

type VariableType = {
  name: string;
  type: string;
  value: string;
};

export default async function MachineConfigView({
  params: { configId, environmentId },
  searchParams,
}: MachineConfigProps) {
  const machineConfig = await getMachineConfigById(configId);
  let variables: VariableType[] = [];

  const addNewVariable = () => {
    variables.push({ name: '', type: '', value: '' });
  };

  return (
    <Content title="Machine Config">
      {/* <Space direction="vertical" size="large" style={{ display: 'flex', height: '100%' }}> */}
      <Divider orientation="left">
        <Breadcrumb
          items={[
            {
              title: <h3>Machine configuration {machineConfig.name}</h3>,
            },
          ]}
        />
      </Divider>
      <Row>
        <Col flex={1}>
          <label>
            Name:
            <Input defaultValue={machineConfig.name}></Input>
          </label>
        </Col>
        <Col flex={6}></Col>
      </Row>
      <Row>
        <Col flex={1}>
          <label>
            Description:
            <TextArea defaultValue={machineConfig.description}></TextArea>
          </label>
        </Col>
        <Col flex={6}></Col>
      </Row>
      <Row>
        <Col flex={1}>
          <br />
          Variables: <Button icon={<PlusOutlined />}></Button>
          {variables.map((val, i) => {
            return (
              <Row>
                Name:
                <Col flex={1}>
                  <Input defaultValue={val.name} />
                </Col>
                Type:
                <Col flex={1}>
                  <Input defaultValue={val.type} />
                </Col>
                Value:
                <Col flex={1}>
                  <Input defaultValue={val.value} />
                </Col>
              </Row>
            );
          })}
        </Col>
        <Col flex={6}></Col>
      </Row>
      <Button>Save</Button>
      {/* </Space> */}
    </Content>
  );
}
