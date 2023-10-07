'use client';

import styles from './page.module.scss';
import { FC, useEffect, useState } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import Modeler from '@/components/modeler';
import cn from 'classnames';
import Content from '@/components/content';
import Overlay from './overlay';
import { useGetAsset } from '@/lib/fetch-data';

type ProcessProps = {
  params: { processId: string };
};

const Processes: FC<ProcessProps> = () => {
  // TODO: check if params is correct after fix release. And maybe don't need
  // refresh in processes.tsx anymore?
  const { processId } = useParams();
  const pathname = usePathname();
  const minimized = pathname !== `/processes/${processId}`;
  const [closed, setClosed] = useState(false);
  const router = useRouter();

  const { data } = useGetAsset('/process', { params: { query: { noBpmn: true } } });

  const process = data?.find((p) => p.definitionId === processId);

  useEffect(() => {
    // Reset closed state when page is not minimized anymore.
    if (!minimized) {
      setClosed(false);
    }
  }, [minimized, router]);

  if (closed) {
    return null;
  }

  return (
    <Content
      compact
      wrapperClass={cn(styles.Wrapper, { [styles.minimized]: minimized }, 'modeler-page-content')}
      headerClass={cn(styles.HF, { [styles.minimizedHF]: minimized })}
      footerClass={cn(styles.HF, { [styles.minimizedHF]: minimized })}
    >
      <Modeler className={styles.Modeler} minimized={minimized} />
      {minimized ? (
        <Overlay processId={processId as string} onClose={() => setClosed(true)} />
      ) : null}
    </Content>
  );
};

export default Processes;
