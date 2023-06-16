'use client';

import styles from './overlay.module.scss';
import { FC } from 'react';
import { CloseOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';

type OverlayProps = {
  processId: string;
  onClose: () => void;
};

const Overlay: FC<OverlayProps> = ({ processId, onClose }) => {
  const router = useRouter();
  return (
    <div className={styles.Overlay} onClick={() => router.push(`/processes/${processId}`)}>
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
