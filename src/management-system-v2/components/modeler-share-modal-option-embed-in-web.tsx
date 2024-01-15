import { useRef } from 'react';

import { CopyOutlined } from '@ant-design/icons';
import { Button, message, Input } from 'antd';
import { TextAreaRef } from 'antd/es/input/TextArea';

const { TextArea } = Input;

interface ModelerShareModalOptionEmdedInWebProps {
  accessToken: string;
}

const ModelerShareModalOptionEmdedInWeb = ({
  accessToken,
}: ModelerShareModalOptionEmdedInWebProps) => {
  const codeSection = useRef<TextAreaRef>(null);

  const handleCopyCodeSection = async () => {
    const codeToEmbed = codeSection.current?.resizableTextArea?.textArea?.value;
    if (codeToEmbed) {
      await navigator.clipboard.writeText(codeToEmbed);
      message.success('Code copied to you clipboard');
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
          value={`<iframe src='${window.location.origin}/shared-viewer?token=${accessToken}' height="100%" width="100%"></iframe>`}
          ref={codeSection}
        />
      </div>
    </>
  );
};

export default ModelerShareModalOptionEmdedInWeb;
