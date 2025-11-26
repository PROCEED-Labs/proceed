import { BPMNCanvasRef } from '@/components/bpmn-canvas';
import { Checkbox, Divider, Space } from 'antd';
import { useEffect, useState } from 'react';
import { is } from 'bpmn-js/lib/util/ModelUtil';
import type { Element } from 'bpmn-js/lib/model/Types';

type IsExecutableSectionProps = {
  modeler: BPMNCanvasRef | null;
  readOnly?: boolean;
};

const IsExecutableSection: React.FC<IsExecutableSectionProps> = ({ modeler, readOnly }) => {
  const [isExecutable, setIsExecutable] = useState(false);
  const [processEl, setProcessEl] = useState<Element | undefined>(undefined);

  useEffect(() => {
    if (modeler) {
      const processes = modeler.getAllElements().filter((el) => is(el, 'bpmn:Process'));

      if (processes.length) {
        const [process] = processes;
        setProcessEl(process as Element);
        setIsExecutable(!!process.businessObject.isExecutable);

        const onUpdate = (event: any) => {
          if (
            event.context?.element?.id === process.id &&
            event.context?.properties &&
            'isExecutable' in event.context.properties
          ) {
            setIsExecutable(event.context.properties.isExecutable);
          }
        };

        const eventBus = modeler.getEventBus();

        eventBus.on('commandStack.element.updateProperties.postExecuted', onUpdate);

        return () => {
          setProcessEl(undefined);
          eventBus.off('commandStack.element.updateProperties.postExecuted', onUpdate);
        };
      }
    }
  }, [modeler]);

  const changeIsExecutable = (value: boolean) => {
    if (processEl) {
      modeler?.getModeling().updateProperties(processEl, { isExecutable: value });
    }
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Divider style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem' }}>
        <span style={{ marginRight: '0.3em', marginBottom: '0.1rem' }}>Executable</span>
      </Divider>
      <Checkbox
        disabled={readOnly}
        title="Toggles if this process is considered to be executable and therefore deployable to the engine."
        checked={isExecutable}
        onChange={(e) => changeIsExecutable(e.target.checked)}
      >
        Is Executable
      </Checkbox>
    </Space>
  );
};

export default IsExecutableSection;
