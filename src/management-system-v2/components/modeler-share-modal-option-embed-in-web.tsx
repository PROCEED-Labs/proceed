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
    const codeToEmbed = codeSection.current?.resizableTextArea.textArea.value;
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
  }, []);

  return (
    <>
      <div style={{ marginBottom: '100px' }}>
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
          value={`<div class="canvas">
            <div id="js-canvas"></div>
        </div>

        <!-- viewer -->
        <script src="https://unpkg.com/bpmn-js@16.0.0/dist/bpmn-viewer.development.js"></script>

        <!-- app -->

        <script>
            var viewer = new BpmnJS({
            container: document.getElementById("js-canvas"),
            height: 600,
            });

            async function openDiagram(xml) {
            try {
                await viewer.importXML(xml);

                viewer.get("canvas").zoom("fit-viewport");
            } catch (err) {
                console.error(err);
            }
            }

            (function loadDiagram() {
            var bpmnXML = ${JSON.stringify(bmpnXML)};
            openDiagram(bpmnXML);
            })();
        </script>`}
          ref={codeSection}
        />
      </div>
    </>
  );
};

export default ModelerShareModalOptionEmdedInWeb;
