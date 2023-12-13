import useModelerStateStore from '@/lib/use-modeler-state-store';
import { useEffect, useRef, useState } from 'react';

import { CopyOutlined } from '@ant-design/icons';
import { Button, message } from 'antd';
import TextArea from 'antd/es/input/TextArea';

const ModelerShareModalOptionEmdedInWeb = () => {
  const [bmpnXML, setBpmnXml] = useState('');
  const modeler = useModelerStateStore((state) => state.modeler);
  const codeSection = useRef(null);

  const handleCopyCodeSection = async () => {
    const codeToEmbed = codeSection.current?.resizableTextArea?.textArea?.value;
    if (codeToEmbed) {
      await navigator.clipboard.writeText(codeToEmbed);
      message.success('Code copied successfully');
    }
  };

  const getXML = async () => {
    if (modeler) {
      const { xml } = await modeler.saveXML({ format: true });
      if (xml) setBpmnXml(xml);
    }
  };

  useEffect(() => {
    getXML();
  });

  return (
    <>
      <div>
        <Button
          icon={<CopyOutlined />}
          style={{ border: '1px solid black', float: 'right' }}
          onClick={handleCopyCodeSection}
        >
          Copy Code
        </Button>
      </div>
      <div className="code">
        <TextArea
          rows={10}
          style={{ backgroundColor: 'rgb(245,245,245)' }}
          value={`here comes the iframe code`} /* TODO: implement iframe logic */
          ref={codeSection}
        />
      </div>
    </>
  );
};

export default ModelerShareModalOptionEmdedInWeb;
