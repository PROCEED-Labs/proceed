'use client';

import type Modeling from 'bpmn-js/lib/features/modeling/Modeling';

import { getFillColor, getStrokeColor } from 'bpmn-js/lib/draw/BpmnRenderUtil';

import type { ElementLike } from 'diagram-js/lib/core/Types';

import useModelerStateStore from '@/lib/use-modeler-state-store';

import React, { FocusEvent, useEffect, useMemo, useRef, useState } from 'react';

import { Input, ColorPicker, Space, Grid, Drawer, Divider } from 'antd';

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
import ImageSelection from './image-selection';

type PropertiesPanelContentProperties = {
  selectedElement: ElementLike;
};

const PropertiesPanelContent: React.FC<PropertiesPanelContentProperties> = ({
  selectedElement,
}) => {
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
    <Space
      direction="vertical"
      size="large"
      style={{ width: '100%', fontSize: '0.75rem' }}
      className="properties-panel"
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Divider style={{ fontSize: '0.85rem' }}>General</Divider>
        <Input
          style={{ fontSize: '0.85rem' }}
          addonBefore="Name"
          placeholder={selectedElement.businessObject.name}
          value={name}
          // onChange={(e) => setName(e.target.value)}
          onBlur={handleNameChange}
          disabled={selectedElement.type === 'bpmn:Process'}
        />

        <Input addonBefore="Type" placeholder={selectedElement.type} disabled />

        <div
          style={{
            width: '75%',
            display: 'flex',
            justifyContent: 'center',
            margin: 'auto',
            marginTop: '1rem',
          }}
        >
          <ImageSelection metaData={metaData}></ImageSelection>
        </div>
      </Space>

      <DescriptionSection
        description={
          (selectedElement.businessObject.documentation &&
            selectedElement.businessObject.documentation[0]?.text) ||
          ''
        }
        selectedElement={selectedElement}
      ></DescriptionSection>

      <MilestoneSelectionSection
        milestones={milestones}
        selectedElement={selectedElement}
      ></MilestoneSelectionSection>

      <Space direction="vertical" style={{ width: '100%' }}>
        <Divider style={{ fontSize: '0.85rem' }}>Properties</Divider>
        <Input
          addonBefore={<EuroCircleOutlined className="clock-icon" />}
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
          addonBefore={<ClockCircleOutlined className="clock-icon" />}
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

      <CustomPropertySection
        metaData={metaData}
        onChange={(name, value) => {
          updateMetaData('property', { value: value, attributes: { name } });
        }}
      ></CustomPropertySection>

      {selectedElement.type !== 'bpmn:Process' && (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Divider style={{ fontSize: '0.85rem' }}>Colors</Divider>
          <Space>
            <ColorPicker
              size="small"
              presets={colorPickerPresets}
              value={backgroundColor}
              onChange={(_, hex) => updateBackgroundColor(hex)}
            />
            <span>Background Colour</span>
          </Space>
          <Space>
            <ColorPicker
              size="small"
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

type PropertiesPanelProperties = {
  selectedElement: ElementLike;
  isOpen: boolean;
  close: () => void;
};

const PropertiesPanel: React.FC<PropertiesPanelProperties> = ({
  selectedElement,
  isOpen,
  close,
}) => {
  const [showInfo, setShowInfo] = useState(true);

  const breakpoint = Grid.useBreakpoint();

  const resizableElementRef = useRef<ResizableElementRefType>(null);
  return breakpoint.md ? (
    <ResizableElement
      initialWidth={450}
      minWidth={450}
      maxWidth={600}
      style={{
        // BPMN.io Symbol with 23 px height + 15 px offset to bottom (=> 38 px), Footer with 70px and Header with 64px, Padding of Toolbar 12px (=> Total 184px)
        height: 'calc(100vh - 190px)',
      }}
      ref={resizableElementRef}
    >
      <CollapsibleCard
        show={showInfo}
        onCollapse={() => {
          //  set width of parent component (resizable element) to 40 which is the desired with of the collapsed card
          if (resizableElementRef.current) {
            if (showInfo) {
              resizableElementRef.current({ width: 40, minWidth: 40, maxWidth: 40 });
            } else {
              resizableElementRef.current({ width: 450, minWidth: 450, maxWidth: 600 });
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
  ) : (
    <Drawer
      open={isOpen}
      width={'100vw'}
      closeIcon={false}
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Properties</span>
          <CloseOutlined
            onClick={() => {
              close();
            }}
          ></CloseOutlined>
        </div>
      }
    >
      <PropertiesPanelContent selectedElement={selectedElement}></PropertiesPanelContent>
    </Drawer>
  );
};

export default PropertiesPanel;
