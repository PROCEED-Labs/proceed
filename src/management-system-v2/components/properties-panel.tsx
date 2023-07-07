'use client';

import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';

import type { ElementLike } from 'diagram-js/lib/core/Types';

import useModelerStateStore from '@/lib/use-modeler-state-store';

import React, { FocusEvent, useEffect, useState } from 'react';

import { Card, Input, ColorPicker } from 'antd';

type PropertiesPanelProperties = {
  selectedElement: ElementLike;
};

const PropertiesPanel: React.FC<PropertiesPanelProperties> = ({ selectedElement }) => {
  const [name, setName] = useState('');

  const modeler = useModelerStateStore((state) => state.modeler);

  useEffect(() => {
    if (selectedElement) {
      setName(selectedElement.businessObject.name);
    }
  }, [selectedElement]);

  const handleNameChange = (event: FocusEvent<HTMLInputElement>) => {
    const modeling = modeler!.get('modeling') as Modeling;
    modeling.updateProperties(selectedElement as any, { name: event.target.value });
  };

  return (
    <Card
      title={selectedElement.id}
      style={{ position: 'absolute', top: 150, right: 20, zIndex: 20 }}
      onClick={(event) => event.preventDefault()}
    >
      Name:{' '}
      <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={handleNameChange} />
    </Card>
  );
};

export default PropertiesPanel;
