import { Skeleton } from 'antd';
import dynamic from 'next/dynamic';

export const ProcessDescription = dynamic(() => import('@/components/text-viewer'), {
  ssr: false,
  // Skeleton width is arbitrary
  loading: () => <Skeleton.Node style={{ width: 150 }} active />,
});
