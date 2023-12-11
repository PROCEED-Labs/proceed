'use client';

import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';

import { getFillColor, getStrokeColor } from 'bpmn-js/lib/draw/BpmnRenderUtil';

import type { ElementLike } from 'diagram-js/lib/core/Types';

import useModelerStateStore from '@/lib/use-modeler-state-store';

import React, { FocusEvent, useEffect, useMemo, useRef, useState } from 'react';

import { Input, ColorPicker, Space, Grid, Drawer } from 'antd';

import { EuroCircleOutlined, ClockCircleOutlined, CloseOutlined } from '@ant-design/icons';
import {
  getMetaDataFromElement,
  getMilestonesFromElement,
  setProceedElement,
} from '@proceed/bpmn-helper';
import CustomPropertySection from './custom-property-section';
import MilestoneSelectionSection from './milestone-selection-section';
import ResizableElement, { ResizableElementRefType } from './ResizableElement';
import CollapsibleCard from './collapsible-card';
import DescriptionSection from './description-section';
import ImageSelectionSection from './image-selection-section';

type PropertiesPanelProperties = {
  selectedElement: ElementLike;
};

const PropertiesPanelContent: React.FC<PropertiesPanelProperties> = ({ selectedElement }) => {
  const [name, setName] = useState('');
  const [costsPlanned, setCostsPlanned] = useState('');
  const [timePlannedDuration, setTimePlannedDuration] = useState('');

  const colorPickerPresets = [
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
  ];

  // deep comparison of extentionElements object to track changes in array
  const metaData = useMemo(() => {
    return getMetaDataFromElement(selectedElement.businessObject);
  }, [JSON.stringify(selectedElement.businessObject.extensionElements)]);
  // deep comparison of extentionElements object to track changes in array
  const milestones = useMemo(() => {
    return getMilestonesFromElement(selectedElement.businessObject);
  }, [JSON.stringify(selectedElement.businessObject.extensionElements)]);

  const description = useMemo(() => {
    if (!selectedElement.businessObject) {
      return '';
    }

    if (selectedElement.businessObject.documentation) {
      return selectedElement.businessObject.documentation[0]?.text;
    } else {
      return '';
    }
  }, [JSON.stringify(selectedElement.businessObject)]);

  useEffect(() => {
    if (selectedElement) {
      setName(selectedElement.businessObject.name);
    }
  }, [selectedElement]);

  useEffect(() => {
    setCostsPlanned(metaData.costsPlanned);
    setTimePlannedDuration(metaData.timePlannedDuration);
  }, [metaData]);

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

  const updateMetaData = (name: string, value: any) => {
    const modeling = modeler!.get('modeling') as Modeling;

    if (name === 'property') {
      setProceedElement(selectedElement.businessObject, name, value.value, value.attributes);
    } else {
      setProceedElement(selectedElement.businessObject, name, value ? value : null);
    }
    modeling.updateProperties(selectedElement as any, {
      extensionElements: selectedElement.businessObject.extensionElements,
    });
  };

  const modeler = useModelerStateStore((state) => state.modeler);
  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <b>General</b>
        <Input
          addonBefore="Name"
          placeholder={selectedElement.businessObject.name}
          value={name}
          // onChange={(e) => setName(e.target.value)}
          onBlur={handleNameChange}
          disabled={selectedElement.type === 'bpmn:Process'}
        />

        <Input addonBefore="Type" size="large" placeholder={selectedElement.type} disabled />
      </Space>

      {selectedElement.type === 'bpmn:UserTask' && (
        <MilestoneSelectionSection
          milestones={milestones}
          selectedElement={selectedElement}
        ></MilestoneSelectionSection>
      )}
      <ImageSelectionSection metaData={metaData}></ImageSelectionSection>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <b>Properties</b>
        <Input
          prefix={<EuroCircleOutlined className="clock-icon" />}
          placeholder="Planned Cost"
          value={costsPlanned}
          onChange={(event) => {
            setCostsPlanned(event.target.value);
          }}
          onBlur={() => {
            updateMetaData('costsPlanned', costsPlanned);
          }}
        />
        <Input
          prefix={<ClockCircleOutlined className="clock-icon" />}
          placeholder="Planned Duration"
          value={timePlannedDuration}
          onChange={(event) => {
            setTimePlannedDuration(event.target.value);
          }}
          onBlur={() => {
            updateMetaData('timePlannedDuration', timePlannedDuration);
          }}
        />
      </Space>

      <DescriptionSection
        description={description}
        selectedElement={selectedElement}
      ></DescriptionSection>
      {/* <Input.TextArea
      size="large"
      placeholder={
        selectedElement.type !== 'bpmn:Process'
          ? 'Element Documentation'
          : 'Process Documentation'
      }
      onChange={(event) => updateDescription(event.target.value)}
    ></Input.TextArea> */}

      <CustomPropertySection
        metaData={metaData}
        onChange={(name, value) => {
          updateMetaData('property', { value: value, attributes: { name } });
        }}
      ></CustomPropertySection>

      {selectedElement.type !== 'bpmn:Process' && (
        <Space direction="vertical" size="large">
          <b>Colors</b>
          <Space>
            <ColorPicker
              presets={colorPickerPresets}
              value={backgroundColor}
              onChange={(_, hex) => updateBackgroundColor(hex)}
            />
            <span>Background Colour</span>
          </Space>
          <Space>
            <ColorPicker
              presets={colorPickerPresets}
              value={strokeColor}
              onChange={(_, hex) => updateStrokeColor(hex)}
            />
            <span>Stroke Colour</span>
          </Space>
        </Space>
      )}
    </Space>
  );
};

const PropertiesPanel: React.FC<PropertiesPanelProperties> = ({ selectedElement }) => {
  const [showInfo, setShowInfo] = useState(true);

  const breakpoint = Grid.useBreakpoint();

  const resizableElementRef = useRef<ResizableElementRefType>(null);
  return breakpoint.xs ? (
    <Drawer
      open={showInfo}
      width={'100vw'}
      closeIcon={false}
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Properties</span>
          <CloseOutlined
            onClick={() => {
              setShowInfo(false);
            }}
          ></CloseOutlined>
        </div>
      }
    >
      <PropertiesPanelContent selectedElement={selectedElement}></PropertiesPanelContent>
    </Drawer>
  ) : (
    <ResizableElement
      initialWidth={450}
      minWidth={450}
      maxWidth={600}
      style={{ position: 'absolute', top: '65px', right: '12px', height: '70vh' }}
      ref={resizableElementRef}
    >
      <CollapsibleCard
        show={showInfo}
        onCollapse={() => {
          //  set width of parent component (resizable element) to 40 which is the desired with of the collapsed card
          if (resizableElementRef.current) {
            if (showInfo) {
              resizableElementRef.current(40);
            } else {
              resizableElementRef.current(450);
            }
          }
          setShowInfo(!showInfo);
        }}
        title="Properties"
        collapsedWidth="40px"
      >
        <PropertiesPanelContent selectedElement={selectedElement}></PropertiesPanelContent>
      </CollapsibleCard>
    </ResizableElement>
  );
};

export default PropertiesPanel;
