'use client';

import React, { useCallback, useRef, useState } from 'react';

import { Drawer } from 'antd';

import Viewer from './bpmn-viewer';
import { ProcessListProcess } from './processes';

type PropertiesPanelProperties = {
  selectedElement: ProcessListProcess;
  setOpen: (open: boolean) => void;
};

const Preview: React.FC<PropertiesPanelProperties> = ({ selectedElement, setOpen }) => {
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
      title=""
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
        onMouseDown={handleMouseDown}
      ></div>
      <Viewer definitionId={selectedElement.definitionId} fitOnResize />
    </Drawer>
  );

  return <>{Panel}</>;
};

export default Preview;
