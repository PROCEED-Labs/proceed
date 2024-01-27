'use client';

import styles from './overlay.module.scss';
import { FC } from 'react';
import { CloseOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useEnvironment } from '@/components/auth-can';

type OverlayProps = {
  processId: string;
  onClose: () => void;
};

const Overlay: FC<OverlayProps> = ({ processId, onClose }) => {
  const router = useRouter();
  const environmentId = useEnvironment();
  return (
    <div
      className={styles.Overlay}
      onClick={() => router.push(`/${environmentId}/processes/${processId}`)}
    >
      <CloseOutlined
        className={styles.Close}
        onClick={(e) => {
          onClose();
          e.stopPropagation();
        }}
      />
    </div>
  );
};

export default Overlay;
