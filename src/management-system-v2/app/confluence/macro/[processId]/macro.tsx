'use client';
import BPMNCanvas from '@/components/bpmn-canvas';
import { getProcessBPMN } from '@/lib/data/processes';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

const Macro = ({
  processId,
  bpmn,
  userId,
}: {
  processId: string;
  bpmn: string;
  userId: string;
}) => {
  const [shouldFetch, setShouldFetch] = useState(false);

  const { data } = useQuery({
    queryKey: [userId, 'process', processId, 'bpmn'],
    queryFn: async () => {
      const res = await getProcessBPMN(processId, userId);
      if (typeof res === 'object' && 'error' in res) {
        throw res.error;
      }
      return res;
    },
    enabled: shouldFetch,
  });

  const BPMN = data || bpmn;

  useEffect(() => {
    if (processId) {
      setShouldFetch(true);
    }
  }, [processId]);

  return (
    <>
      {/* <Viewer definitionId={processId}></Viewer> */}
      <div style={{ height: '100vh' }}>
        <BPMNCanvas type="viewer" bpmn={{ bpmn: BPMN }}></BPMNCanvas>
      </div>
    </>
  );
};

export default Macro;
