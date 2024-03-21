import { useEffect, useState } from 'react';
import { CopyOutlined } from '@ant-design/icons';
import { Button, message, Input, Checkbox, Typography } from 'antd';
import { useParams } from 'next/navigation';
import {
  generateProcessShareToken,
  updateProcessGuestAccessRights,
} from '@/lib/sharing/process-sharing';
import ErrorMessage from '@/components/error-message';
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
  const [token, setToken] = useState('');

  useEffect(() => {
    const initialize = async () => {
      if (allowIframeTimestamp > 0) {
        const { token: shareToken } = await generateProcessShareToken(
          { processId: processId, embeddedMode: true },
          environment.spaceId,
          allowIframeTimestamp,
        );
        setToken(shareToken);
      }
    };
    initialize();
  }, [allowIframeTimestamp, environment.spaceId, processId, sharedAs]);

  const handleAllowEmbeddingChecked = async (e: {
    target: { checked: boolean | ((prevState: boolean) => boolean) };
  }) => {
    const isChecked = e.target.checked;
    if (isChecked) {
      const { token } = await generateProcessShareToken(
        { processId, embeddedMode: true },
        environment.spaceId,
      );
      setToken(token);
      await updateProcessGuestAccessRights(processId, { sharedAs: 'public' }, environment.spaceId);
      message.success('Process shared');
    } else {
      await updateProcessGuestAccessRights(
        processId,
        {
          allowIframeTimestamp: 0,
        },
        environment.spaceId,
      );
      setToken('');
      message.success('Process unshared');
    }
    refresh();
  };

  const iframeCode = `<iframe src='${window.location.origin}/shared-viewer?token=${token}' height="100%" width="100%"></iframe>`;

  const handleCopyCodeSection = async () => {
    await navigator.clipboard.writeText(iframeCode);
    message.success('Code copied to you clipboard');
  };

  return (
    <>
      <Checkbox
        checked={token.length > 0 && allowIframeTimestamp > 0}
        onChange={(e) => handleAllowEmbeddingChecked(e)}
      >
        Allow iframe Embedding
      </Checkbox>
      {token.length > 0 ? (
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
