'use client';

import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';

import type { ElementLike } from 'diagram-js/lib/core/Types';

import useModelerStateStore from '@/lib/use-modeler-state-store';

import React, { FocusEvent, useCallback, useEffect, useRef, useState } from 'react';

import { Card, Input, ColorPicker, Drawer, Space, Image } from 'antd';

import { EuroCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { ApiData } from '@/lib/fetch-data';
import { useProcessBpmn } from '@/lib/process-queries';

import type ViewerType from 'bpmn-js/lib/Viewer';
import Viewer from './bpmn-viewer';

type PropertiesPanelProperties = {
  selectedElement?: ApiData<'/process', 'get'>[number];
  setOpen: (open: boolean) => void;
};

const Preview: React.FC<PropertiesPanelProperties> = ({ selectedElement, setOpen }) => {
  const [name, setName] = useState('');
  const [drawerHeight, setDrawerHeight] = useState(200);

  let resizingDrawer = useRef(false);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const newHeight = document.body.clientHeight - e.clientY;
    const [minHeight, maxHeight] = [150, 850];
    if (newHeight > minHeight && newHeight < maxHeight) {
      setDrawerHeight(newHeight);
    }
  }, []);
  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      if (!resizingDrawer.current) return;

      resizingDrawer.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      /* Trigger Viewer rerender: */
      setDrawerHeight((prev) => prev + 1);
    },
    [handleMouseMove],
  );

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.preventDefault();
    e.stopPropagation();
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    resizingDrawer.current = true;
  };

  const Panel = (
    <Drawer
      height={drawerHeight}
      title={name}
      placement="bottom"
      onClose={(e) => {
        setOpen(false);
      }}
      open={true}
      mask={false}
    >
      <div
        style={{
          position: 'absolute',
          bottom: drawerHeight - 4,
          zIndex: 1_000,
          width: '100vw',
          height: '8px',
          margin: 0,
          left: 0,
          cursor: 'row-resize',
        }}
        className="Test"
        onMouseDown={handleMouseDown}
      ></div>
      <Viewer selectedElement={selectedElement} rerenderTrigger={drawerHeight} />
    </Drawer>
  );

  return <>{Panel}</>;
};

export default Preview;
