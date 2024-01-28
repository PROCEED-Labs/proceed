import { useEffect, useRef, useState } from 'react';
import { CopyOutlined } from '@ant-design/icons';
import { Button, message, Input, Checkbox, Typography } from 'antd';
import { TextAreaRef } from 'antd/es/input/TextArea';
import { generateToken, updateProcessGuestAccessRights } from '@/actions/actions';
import { useParams } from 'next/navigation';

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
  const codeSection = useRef<TextAreaRef>(null);
  const [isAllowEmbeddingChecked, setIsAllowEmbeddingChecked] = useState(
    shared && sharedAs === 'public' ? true : false,
  );
  const [token, setToken] = useState('');

  const initialize = async () => {
    if (shared && sharedAs === 'public') {
      const { token } = await generateToken({ processId, embeddedMode: true });
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
      const { token } = await generateToken({ processId, embeddedMode: true });
      setToken(token);
      await updateProcessGuestAccessRights(processId, { shared: true, sharedAs: 'public' });
      message.success('Process shared');
    } else {
      await updateProcessGuestAccessRights(processId, { shared: false });
      message.success('Process unshared');
    }
    refresh();
  };

  const handleCopyCodeSection = async () => {
    const codeToEmbed = codeSection.current?.resizableTextArea?.textArea?.value;
    if (codeToEmbed) {
      await navigator.clipboard.writeText(codeToEmbed);
      message.success('Code copied to you clipboard');
    }
  };

  return (
    <>
      <Checkbox checked={isAllowEmbeddingChecked} onClick={(e) => handleAllowEmbeddingChecked(e)}>
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
            <TextArea
              rows={2}
              style={{ backgroundColor: 'rgb(245,245,245)' }}
              value={`<iframe src='${window.location.origin}/shared-viewer?token=${token}' height="100%" width="100%"></iframe>`}
              ref={codeSection}
            />
          </div>
        </>
      ) : null}
    </>
  );
};

export default ModelerShareModalOptionEmdedInWeb;
