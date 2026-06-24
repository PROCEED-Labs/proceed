import { BPMNCanvasRef } from '@/components/bpmn-canvas';
import { Alert, Checkbox, Space, Spin } from 'antd';
import { getProcessBPMN, updateProcessMetaData } from '@/lib/data/processes';
import { useParams, useSearchParams } from 'next/navigation';
import { useEnvironment } from '@/components/auth-can';
import useModelerStateStore from './use-modeler-state-store';
import { wrapServerCall } from '@/lib/wrap-server-call';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getElementsByTagName, toBpmnObject } from '@proceed/bpmn-helper';
import { isUserErrorResponse } from '@/lib/user-error';

type IsExecutableSectionProps = {
  modeler: BPMNCanvasRef | null;
  readOnly?: boolean;
};

const IsExecutableSection: React.FC<IsExecutableSectionProps> = ({ modeler, readOnly }) => {
  const isExecutable = useModelerStateStore((state) => state.isExecutable);
  const setIsExecutable = useModelerStateStore((state) => state.setIsExecutable);

  const [loading, setLoading] = useState(false);
  const [previousVersionId, setPreviousVersionId] = useState('');

  const { processId } = useParams();
  const { spaceId } = useEnvironment();

  const query = useSearchParams();
  const selectedVersionId = query.get('version');

  useEffect(() => {
    const eventBus = modeler?.getEventBus();

    if (eventBus) {
      const onImport = async () => {
        const root = modeler?.getCurrentRoot()?.businessObject.$parent;
        setPreviousVersionId(root?.processVersionBasedOn || '');
      };

      onImport();

      eventBus.on('import.done', onImport);

      return () => {
        eventBus.off('import.done', onImport);
      };
    }
  }, [modeler]);

  const { data: lastVersionWasExecutable } = useQuery({
    queryFn: async () => {
      if (previousVersionId) {
        const versionBpmn = await getProcessBPMN(processId as string, spaceId, previousVersionId);
        if (isUserErrorResponse(versionBpmn)) return false;
        const bpmnObj = await toBpmnObject(versionBpmn);

        const [process] = getElementsByTagName(bpmnObj, 'bpmn:Process');

        return !!process.isExecutable;
      }

      return false;
    },
    queryKey: ['get-last-version-executable-state', spaceId, processId, previousVersionId],
  });

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
    <Space orientation="vertical" style={{ width: '100%' }}>
      <Space>
        {loading ? (
          <Spin style={{ width: '16px' }} size="small" />
        ) : (
          <>
            <Checkbox
              disabled={readOnly}
              title="Toggles if this process is considered to be executable and therefore deployable to the engine."
              checked={isExecutable}
              onChange={(e) => changeIsExecutable(e.target.checked)}
            />
          </>
        )}
        Activate Automation for the entire Process
      </Space>
      {!selectedVersionId && !isExecutable && lastVersionWasExecutable && (
        <Alert
          type="warning"
          title="Attention: currently, the automation feature has been disabled, even though the previous process version supported automation. This means if you create a new version of the current process, you will no longer be able to start new executions of this process."
        />
      )}
    </Space>
  );
};

export default IsExecutableSection;
