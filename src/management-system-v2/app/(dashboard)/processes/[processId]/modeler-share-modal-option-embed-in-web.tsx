import { useEffect, useRef, useState } from 'react';
import { CopyOutlined } from '@ant-design/icons';
import { Button, message, Input, Checkbox, Typography } from 'antd';
import { TextAreaRef } from 'antd/es/input/TextArea';
import { useParams } from 'next/navigation';
import {
  generateProcessShareToken,
  updateProcessGuestAccessRights,
} from '@/lib/sharing/process-sharing';

const { TextArea } = Input;

type ModelerShareModalOptionEmdedInWebProps = {
  shared: boolean;
  sharedAs: 'public' | 'protected';
  refresh: () => void;
};

const ModelerShareModalOptionEmdedInWeb = ({
  shared,
  sharedAs,
  refresh,
}: ModelerShareModalOptionEmdedInWebProps) => {
  const { processId } = useParams();
  const [isAllowEmbeddingChecked, setIsAllowEmbeddingChecked] = useState(
    shared && sharedAs === 'public' ? true : false,
  );
  const [token, setToken] = useState('');

  const initialize = async () => {
    if (shared && sharedAs === 'public') {
      const { token } = await generateProcessShareToken({ processId, embeddedMode: true });
      setToken(token);
      //await updateProcessGuestAccessRights(processId, { shared: true, sharedAs: 'public' });
    }
  };
  useEffect(() => {
    initialize();
  }, [shared, sharedAs]);

  if (sharedAs === 'protected')
    return (
      <>
        <Typography.Text type="danger">Process is not public</Typography.Text>
      </>
    );

  const handleAllowEmbeddingChecked = async (e: {
    target: { checked: boolean | ((prevState: boolean) => boolean) };
  }) => {
    const isChecked = e.target.checked;
    setIsAllowEmbeddingChecked(isChecked);
    if (isChecked) {
      const { token } = await generateProcessShareToken({ processId, embeddedMode: true });
      setToken(token);
      await updateProcessGuestAccessRights(processId, { shared: true, sharedAs: 'public' });
      message.success('Process shared');
    } else {
      await updateProcessGuestAccessRights(processId, { shared: false });
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
