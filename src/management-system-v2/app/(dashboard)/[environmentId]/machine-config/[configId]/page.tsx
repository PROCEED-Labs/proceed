//I have no idea what I'm doing...

import Content from '@/components/content';
import { Space } from 'antd';
import { getCurrentEnvironment } from '@/components/auth';
//import styles from './page.module.scss';
import { getMachineConfig, getMachineConfigById } from '@/lib/data/legacy/machine-config';
//import { toCaslResource } from '@/lib/ability/caslAbility';

import { Breadcrumb, Input, Button } from 'antd';
import { Col, Divider, Row } from 'antd';

type MachineConfigProps = {
  params: { configId: string; environmentId: string };
  searchParams: { version?: string };
};

const MachineConfig = async ({
  params: { configId, environmentId },
  searchParams,
}: MachineConfigProps) => {
  const { ability } = await getCurrentEnvironment(environmentId);
  const machineConfig = getMachineConfigById(configId, ability);

  return (
    <Content title="Machine Config">
      {/* <Space direction="vertical" size="large" style={{ display: 'flex', height: '100%' }}> */}
      <Divider orientation="left">
        <Breadcrumb
          items={[
            {
              title: <h3>Machine configuration #{configId}</h3>,
            },
          ]}
        />
      </Divider>
      <Row>
        <Col flex={1}>
          <label>
            Name:
            <Input></Input>
          </label>
        </Col>
        <Col flex={6}></Col>
      </Row>
      {/* </Space> */}
    </Content>
  );
};

export default MachineConfig;
