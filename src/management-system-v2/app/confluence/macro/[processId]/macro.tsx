'use client';
import BPMNCanvas from '@/components/bpmn-canvas';
import Viewer from '@/components/bpmn-viewer';
import { getProcessBPMN } from '@/lib/data/processes';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
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
      console.log('USE QUERY');

      const res = await getProcessBPMN(processId, userId);
      console.log('res', res);
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
      <BPMNCanvas type="viewer" bpmn={{ bpmn: BPMN }}></BPMNCanvas>
    </>
  );
};

export default Macro;
