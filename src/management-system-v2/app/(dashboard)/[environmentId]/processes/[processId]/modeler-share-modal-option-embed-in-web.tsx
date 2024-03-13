import { useEffect, useState } from 'react';
import { CopyOutlined } from '@ant-design/icons';
import { Button, message, Input, Checkbox, Typography } from 'antd';
import { useParams } from 'next/navigation';
import {
  generateSharedViewerUrl,
  updateProcessGuestAccessRights,
} from '@/lib/sharing/process-sharing';
import ErrorMessage from '@/components/error-message';

const { TextArea } = Input;

type ModelerShareModalOptionEmdedInWebProps = {
  shared: boolean;
  sharedAs: 'public' | 'protected';
  shareTimestamp?: number;
  refresh: () => void;
};

const ModelerShareModalOptionEmdedInWeb = ({
  shared,
  sharedAs,
  shareTimestamp,
  refresh,
}: ModelerShareModalOptionEmdedInWebProps) => {
  const { processId } = useParams();
  const [isAllowEmbeddingChecked, setIsAllowEmbeddingChecked] = useState(
    shared && sharedAs === 'public',
  );
  const [embeddingUrl, setEmbeddingUrl] = useState('');

  const initialize = async () => {
    if (shared && sharedAs === 'public' && shareTimestamp) {
      // TODO: handle this separate from the shareTimestamp (embedTimestamp?)
      const url = await generateSharedViewerUrl({
        processId,
        embeddedMode: true,
        timestamp: shareTimestamp,
      });
      setEmbeddingUrl(url);
    }
  };
  useEffect(() => {
    initialize();
  }, [shared, sharedAs, shareTimestamp]);

  if (sharedAs === 'protected') return <ErrorMessage message="Process is not shared as public" />;

  const handleAllowEmbeddingChecked = async (e: {
    target: { checked: boolean | ((prevState: boolean) => boolean) };
  }) => {
    const isChecked = e.target.checked;
    setIsAllowEmbeddingChecked(isChecked);
    if (isChecked) {
      const timestamp = +new Date();
      const url = await generateSharedViewerUrl({
        processId,
        embeddedMode: true,
        timestamp,
      });
      setEmbeddingUrl(url);
      await updateProcessGuestAccessRights(processId, {
        shared: true,
        sharedAs: 'public',
        shareTimestamp: timestamp,
      });
      message.success('Process shared');
    } else {
      await updateProcessGuestAccessRights(processId, { shared: false, shareTimestamp: undefined });
      message.success('Process unshared');
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
      <Checkbox checked={isAllowEmbeddingChecked} onChange={(e) => handleAllowEmbeddingChecked(e)}>
        Allow iframe Embedding
      </Checkbox>
      {isAllowEmbeddingChecked ? (
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
