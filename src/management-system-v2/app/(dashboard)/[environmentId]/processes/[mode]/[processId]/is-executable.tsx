import { BPMNCanvasRef } from '@/components/bpmn-canvas';
import { Checkbox, Divider, Space } from 'antd';
import { useEffect, useState } from 'react';
import { is, isAny } from 'bpmn-js/lib/util/ModelUtil';
import type { Element } from 'bpmn-js/lib/model/Types';
import { updateProcessMetaData } from '@/lib/data/processes';
import { useParams, useRouter } from 'next/navigation';
import { useEnvironment } from '@/components/auth-can';
import useModelerStateStore from './use-modeler-state-store';

type IsExecutableSectionProps = {
  modeler: BPMNCanvasRef | null;
  readOnly?: boolean;
};

const IsExecutableSection: React.FC<IsExecutableSectionProps> = ({ modeler, readOnly }) => {
  const isExecutable = useModelerStateStore((state) => state.isExecutable);

  const { processId } = useParams();
  const { spaceId } = useEnvironment();
  const router = useRouter();

  const changeIsExecutable = async (value: boolean) => {
    if (modeler) {
      // update the executable value in the database
      await updateProcessMetaData(processId as string, spaceId, { executable: value });
      router.refresh();
    }
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Divider style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem' }}>
        <span style={{ marginRight: '0.3em', marginBottom: '0.1rem' }}>Executable</span>
      </Divider>
      <Checkbox
        disabled={readOnly}
        title="Toggles if this process is considered to be executable and therefore deployable to the engine."
        checked={isExecutable}
        onChange={(e) => changeIsExecutable(e.target.checked)}
      >
        Activate Automation for the entire Process
      </Checkbox>
    </Space>
  );
};

export default IsExecutableSection;
