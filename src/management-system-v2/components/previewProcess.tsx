'use client';

import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';

import type { ElementLike } from 'diagram-js/lib/core/Types';

import useModelerStateStore from '@/lib/use-modeler-state-store';

import React, { FocusEvent, useEffect, useState } from 'react';

import { Card, Input, ColorPicker, Drawer, Space, Image } from 'antd';

import { EuroCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { Process } from '@/lib/fetch-data';

type PropertiesPanelProperties = {
  selectedElement?: Process | undefined;
  setOpen: (open: boolean) => void;
};

const Preview: React.FC<PropertiesPanelProperties> = ({ selectedElement, setOpen }) => {
  const [name, setName] = useState('');

  useEffect(() => {
    if (selectedElement) {
      setName(selectedElement.definitionName);
    }
  }, [selectedElement]);

  const Panel = (
    <Drawer
      title={name}
      placement="bottom"
      onClose={(e) => {
        setOpen(false);
      }}
      open={true}
      mask={false}
    ></Drawer>
  );

  return <>{Panel}</>;
};

export default Preview;
