import { useRef, useState, useEffect } from 'react';

import { CopyOutlined } from '@ant-design/icons';
import { Button, message, Input } from 'antd';
import { useParams } from 'next/navigation';
import { TextAreaRef } from 'antd/es/input/TextArea';
import { generateToken, updateProcessGuestAccessRights } from '@/actions/actions';

const { TextArea } = Input;

const ModelerShareModalOptionEmdedInWeb = () => {
  const { processId } = useParams();
  const [token, setToken] = useState('');

  useEffect(() => {
    const generateAccessToken = async () => {
      const newToken = await generateToken({ processId: processId, embeddedMode: true });
      await updateProcessGuestAccessRights(processId, { shared: true, sharedAs: 'public' });
      setToken(newToken);
    };

    generateAccessToken();
  }, []);

  const codeSection = useRef<TextAreaRef>(null);

  const handleCopyCodeSection = async () => {
    const codeToEmbed = codeSection.current?.resizableTextArea?.textArea?.value;
    if (codeToEmbed) {
      await navigator.clipboard.writeText(codeToEmbed);
      message.success('Code copied successfully');
    }
  };

  return (
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
  );
};

export default ModelerShareModalOptionEmdedInWeb;
