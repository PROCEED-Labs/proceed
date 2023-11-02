'use client';

import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';

import { getFillColor, getStrokeColor } from 'bpmn-js/lib/draw/BpmnRenderUtil';

import type { ElementLike } from 'diagram-js/lib/core/Types';

import useModelerStateStore from '@/lib/use-modeler-state-store';

import React, { FocusEvent, useEffect, useMemo, useState } from 'react';

import { Card, Input, ColorPicker, Drawer, Space, Image } from 'antd';

import { EuroCircleOutlined, ClockCircleOutlined, CloseOutlined } from '@ant-design/icons';
import ResizableCard from './ResizableCard';

type PropertiesPanelProperties = {
  selectedElement: ElementLike;
  setOpen: (open: boolean) => void;
};

const PropertiesPanel: React.FC<PropertiesPanelProperties> = ({ selectedElement, setOpen }) => {
  const [name, setName] = useState('');

  const modeler = useModelerStateStore((state) => state.modeler);

  useEffect(() => {
    if (selectedElement) {
      setName(selectedElement.businessObject.name);
      console.log(selectedElement);
    }
  }, [selectedElement]);

  const backgroundColor = useMemo(() => {
    return getFillColor(selectedElement, '#FFFFFFFF');
  }, [selectedElement]);

  const strokeColor = useMemo(() => {
    return getStrokeColor(selectedElement, '#000000FF');
  }, [selectedElement]);

  const handleNameChange = (event: FocusEvent<HTMLInputElement>) => {
    const modeling = modeler!.get('modeling') as Modeling;
    modeling.updateProperties(selectedElement as any, { name: event.target.value });
    setName('');
  };

  const updateBackgroundColor = (backgroundColor: string) => {
    const modeling = modeler!.get('modeling') as Modeling;
    modeling.setColor(selectedElement as any, {
      fill: backgroundColor,
    });
  };
  const updateStrokeColor = (frameColor: string) => {
    const modeling = modeler!.get('modeling') as Modeling;
    modeling.setColor(selectedElement as any, {
      stroke: frameColor,
    });
  };

  return (
    <ResizableCard
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>name</span> <CloseOutlined onClick={() => setOpen(false)} />
        </div>
      }
      initialWidth={400}
      minWidth={400}
      maxWidth={600}
      style={{ position: 'absolute', top: '65px', right: '12px', height: '80vh' }}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <b>General</b>
          <Input
            addonBefore="Name"
            size="large"
            placeholder={selectedElement.businessObject.name}
            value={name}
            // onChange={(e) => setName(e.target.value)}
            onBlur={handleNameChange}
            disabled={selectedElement.type === 'bpmn:Process'}
          />
          <Input
            addonBefore="ID &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"
            size="large"
            placeholder={selectedElement.id}
            disabled
          />
        </Space>

        <Space direction="vertical" size="large">
          <b>Image</b>
          <Image
            width={200}
            height={200}
            src="error"
            fallback="data:image/png;base64,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"
            alt="No Image"
          />
        </Space>

        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <b>Properties</b>
          <Input
            prefix={<EuroCircleOutlined className="clock-icon" />}
            size="large"
            placeholder="Planned Cost"
          />
          <Input
            prefix={<ClockCircleOutlined className="clock-icon" />}
            size="large"
            placeholder="Planned Duration"
          />
        </Space>

        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <b>Documentation</b>
          <Input.TextArea
            size="large"
            placeholder={
              selectedElement.type !== 'bpmn:Process'
                ? 'Element Documentation'
                : 'Process Documentation'
            }
          ></Input.TextArea>
        </Space>

        {selectedElement.type !== 'bpmn:Process' && (
          <Space direction="vertical" size="large">
            <b>Colors</b>
            <Space>
              <ColorPicker
                presets={[
                  {
                    label: 'Recommended',
                    colors: [
                      '#000000',
                      '#000000E0',
                      '#000000A6',
                      '#00000073',
                      '#00000040',
                      '#00000026',
                      '#0000001A',
                      '#00000012',
                      '#0000000A',
                      '#00000005',
                      '#F5222D',
                      '#FA8C16',
                      '#FADB14',
                      '#8BBB11',
                      '#52C41A',
                      '#13A8A8',
                      '#1677FF',
                      '#2F54EB',
                      '#722ED1',
                      '#EB2F96',
                      '#F5222D4D',
                      '#FA8C164D',
                      '#FADB144D',
                      '#8BBB114D',
                      '#52C41A4D',
                      '#13A8A84D',
                      '#1677FF4D',
                      '#2F54EB4D',
                      '#722ED14D',
                      '#EB2F964D',
                    ],
                  },
                  {
                    label: 'Recent',
                    colors: [],
                  },
                ]}
                value={backgroundColor}
                onChange={(_, hex) => updateBackgroundColor(hex)}
              />
              <span>Background Colour</span>
            </Space>
            <Space>
              <ColorPicker
                presets={[
                  {
                    label: 'Recommended',
                    colors: [
                      '#000000',
                      '#000000E0',
                      '#000000A6',
                      '#00000073',
                      '#00000040',
                      '#00000026',
                      '#0000001A',
                      '#00000012',
                      '#0000000A',
                      '#00000005',
                      '#F5222D',
                      '#FA8C16',
                      '#FADB14',
                      '#8BBB11',
                      '#52C41A',
                      '#13A8A8',
                      '#1677FF',
                      '#2F54EB',
                      '#722ED1',
                      '#EB2F96',
                      '#F5222D4D',
                      '#FA8C164D',
                      '#FADB144D',
                      '#8BBB114D',
                      '#52C41A4D',
                      '#13A8A84D',
                      '#1677FF4D',
                      '#2F54EB4D',
                      '#722ED14D',
                      '#EB2F964D',
                    ],
                  },
                  {
                    label: 'Recent',
                    colors: [],
                  },
                ]}
                value={strokeColor}
                onChange={(_, hex) => updateStrokeColor(hex)}
              />
              <span>Stroke Colour</span>
            </Space>
          </Space>
        )}
      </Space>
    </ResizableCard>
  );
};

export default PropertiesPanel;
