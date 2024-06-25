import Content from '@/components/content';
import { Space } from 'antd';
import { getCurrentEnvironment } from '@/components/auth';
//import styles from './page.module.scss';
import {
  createMachineConfig,
  getMachineConfigById,
  saveMachineConfig,
} from '@/lib/data/legacy/machine-config';
//import { toCaslResource } from '@/lib/ability/caslAbility';
import { Breadcrumb, Input, Button, Form } from 'antd';
import { Col, Divider, Row } from 'antd';
import MachineConfigEditor from './machine-config-editor';
import ConfigContent from './config-content';

type MachineConfigProps = {
  params: { configId: string; environmentId: string };
  searchParams: { version?: string };
};

export default async function MachineConfigView({
  params: { configId, environmentId },
  searchParams,
}: MachineConfigProps) {
  let machineConfig = await getMachineConfigById(configId);

  //replace ConfigContent <-> MachineConfigEditor as needed
  return (
    <Content title="Machine Configuration">
      <ConfigContent
        originalMachineConfig={machineConfig}
        backendSaveMachineConfig={saveMachineConfig}
        backendCreateMachineConfig={createMachineConfig}
        configId={configId}
      />
    </Content>
  );
}
