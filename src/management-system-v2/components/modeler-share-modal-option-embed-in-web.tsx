import useModelerStateStore from '@/lib/use-modeler-state-store';
import { useRef, useState } from 'react';

import { CopyOutlined } from '@ant-design/icons';
import { Button, message, Input } from 'antd';
import { useParams } from 'next/navigation';
import { TextAreaRef } from 'antd/es/input/TextArea';

const { TextArea } = Input;

const ModelerShareModalOptionEmdedInWeb = () => {
  const { processId } = useParams();
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
          value={`<iframe src='http://localhost:3000/embedded-viewer/${processId}' height="100%" width="100%" />`} /* TODO: implement iframe logic */
          ref={codeSection}
        />
      </div>
    </>
  );
};

export default ModelerShareModalOptionEmdedInWeb;
