import { BPMNCanvasRef } from '@/components/bpmn-canvas';
import { Checkbox, Divider, Space, Spin } from 'antd';
import { updateProcessMetaData } from '@/lib/data/processes';
import { useParams } from 'next/navigation';
import { useEnvironment } from '@/components/auth-can';
import useModelerStateStore from './use-modeler-state-store';
import { wrapServerCall } from '@/lib/wrap-server-call';
import { useState } from 'react';

type IsExecutableSectionProps = {
  modeler: BPMNCanvasRef | null;
  readOnly?: boolean;
};

const IsExecutableSection: React.FC<IsExecutableSectionProps> = ({ modeler, readOnly }) => {
  const isExecutable = useModelerStateStore((state) => state.isExecutable);
  const setIsExecutable = useModelerStateStore((state) => state.setIsExecutable);

  const [loading, setLoading] = useState(false);

  const { processId } = useParams();
  const { spaceId } = useEnvironment();

  const changeIsExecutable = async (value: boolean) => {
    if (modeler) {
      // update the executable value in the database
      setLoading(true);
      await wrapServerCall({
        fn: async () => updateProcessMetaData(processId as string, spaceId, { executable: value }),
        onSuccess: () => setIsExecutable(value),
        onError: 'Failed to update the executable property.',
      });
      setLoading(false);
    }
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Divider style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem' }}>
        <span style={{ marginRight: '0.3em', marginBottom: '0.1rem' }}>Executable</span>
      </Divider>
      <Space>
        {loading ? (
          <Spin style={{ width: '16px' }} size="small" />
        ) : (
          <Checkbox
            disabled={readOnly}
            title="Toggles if this process is considered to be executable and therefore deployable to the engine."
            checked={isExecutable}
            onChange={(e) => changeIsExecutable(e.target.checked)}
          />
        )}
        Activate Automation for the entire Process
      </Space>
    </Space>
  );
};

export default IsExecutableSection;
