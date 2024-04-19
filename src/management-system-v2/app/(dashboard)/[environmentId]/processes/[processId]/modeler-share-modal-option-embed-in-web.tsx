'use client';
import { useEffect, useState } from 'react';
import { CopyOutlined } from '@ant-design/icons';
import { Button, Input, Checkbox, App } from 'antd';
import { useParams } from 'next/navigation';
import {
  generateSharedViewerUrl,
  updateProcessGuestAccessRights,
} from '@/lib/sharing/process-sharing';
import { useEnvironment } from '@/components/auth-can';

const { TextArea } = Input;

type ModelerShareModalOptionEmdedInWebProps = {
  sharedAs: 'public' | 'protected';
  allowIframeTimestamp: number;
  refresh: () => void;
};

const ModelerShareModalOptionEmdedInWeb = ({
  sharedAs,
  allowIframeTimestamp,
  refresh,
}: ModelerShareModalOptionEmdedInWebProps) => {
  const { processId } = useParams();
  const environment = useEnvironment();
  const [embeddingUrl, setEmbeddingUrl] = useState('');
  const { message } = App.useApp();

  useEffect(() => {
    const initialize = async () => {
      if (allowIframeTimestamp > 0) {
        const url = await generateSharedViewerUrl({
          processId,
          embeddedMode: true,
          timestamp: allowIframeTimestamp,
        });
        setEmbeddingUrl(url);
      }
    };
    initialize();
  }, [allowIframeTimestamp, environment.spaceId, processId, sharedAs]);

  const handleAllowEmbeddingChecked = async (e: {
    target: { checked: boolean | ((prevState: boolean) => boolean) };
  }) => {
    const isChecked = e.target.checked;
    if (isChecked) {
      const timestamp = Date.now();
      const url = await generateSharedViewerUrl({
        processId,
        embeddedMode: true,
        timestamp,
      });
      setEmbeddingUrl(url);
      await updateProcessGuestAccessRights(
        processId,
        {
          sharedAs: 'public',
          allowIframeTimestamp: timestamp,
        },
        environment.spaceId,
      );
    } else {
      await updateProcessGuestAccessRights(
        processId,
        { allowIframeTimestamp: 0 },
        environment.spaceId,
      );
      setEmbeddingUrl('');
    }
    refresh();
  };

  const iframeCode = `<iframe src='${embeddingUrl}' height="100%" width="100%"></iframe>`;

  const handleCopyCodeSection = async () => {
    await navigator.clipboard.writeText(iframeCode);
    message.success('Code copied to you clipboard');
  };

  return (
    <>
      <Checkbox
        checked={embeddingUrl.length > 0 && allowIframeTimestamp > 0}
        onChange={(e) => handleAllowEmbeddingChecked(e)}
      >
        Allow iframe Embedding
      </Checkbox>
      {embeddingUrl.length > 0 ? (
        <>
          <div>
            <Button
              icon={<CopyOutlined />}
              style={{ border: '1px solid black', float: 'right' }}
              onClick={handleCopyCodeSection}
              title="copy code"
            />
          </div>
          <div className="code">
            <TextArea rows={2} value={iframeCode} style={{ backgroundColor: 'rgb(245,245,245)' }} />
          </div>
        </>
      ) : null}
    </>
  );
};

export default ModelerShareModalOptionEmdedInWeb;
