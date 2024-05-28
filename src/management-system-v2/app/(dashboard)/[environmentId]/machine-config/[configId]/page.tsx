import Content from '@/components/content';
import { Space } from 'antd';
import { getCurrentEnvironment } from '@/components/auth';
//import styles from './page.module.scss';
import { getMachineConfigById, saveMachineConfig } from '@/lib/data/legacy/machine-config';
//import { toCaslResource } from '@/lib/ability/caslAbility';
import { Breadcrumb, Input, Button, Form } from 'antd';
import { Col, Divider, Row } from 'antd';
import MachineConfigEditor from './machineConfigEditor';

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
  let machineConfig = await getMachineConfigById(configId);

  return (
    <Content title="Machine Config">
      <MachineConfigEditor
        originalMachineConfig={machineConfig}
        onChange={saveMachineConfig}
        configId={configId}
      />
    </Content>
  );
}
