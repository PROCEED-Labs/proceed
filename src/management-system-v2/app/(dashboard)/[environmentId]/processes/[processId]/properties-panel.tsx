'use client';

import { getFillColor, getStrokeColor } from 'bpmn-js/lib/draw/BpmnRenderUtil';
import type { ElementLike } from 'diagram-js/lib/core/Types';
import useModelerStateStore from './use-modeler-state-store';
import React, { FocusEvent, useEffect, useRef, useState } from 'react';
import styles from './properties-panel.module.scss';

import { Input, ColorPicker, Space, Grid, Divider, Modal } from 'antd';

import { CloseOutlined, EditOutlined } from '@ant-design/icons';
import { getMetaDataFromElement, setProceedElement } from '@proceed/bpmn-helper';
import CustomPropertySection from './custom-property-section';
import MilestoneSelectionSection from './milestone-selection-section';
import ResizableElement, { ResizableElementRefType } from '@/components/ResizableElement';
import CollapsibleCard from '@/components/collapsible-card';
import ImageSelectionSection from './image-selection-section';
import PlannedDurationInput from './planned-duration-input';
import DescriptionSection from './description-section';

import PlannedCostInput from './planned-cost-input';

type PropertiesPanelContentProperties = {
  selectedElement: ElementLike;
};

const PropertiesPanelContent: React.FC<PropertiesPanelContentProperties> = ({
  selectedElement,
}) => {
  const metaData = getMetaDataFromElement(selectedElement.businessObject);
  const backgroundColor = getFillColor(selectedElement, '#FFFFFFFF');
  const strokeColor = getStrokeColor(selectedElement, '#000000FF');

  const [name, setName] = useState(selectedElement.businessObject.name);
  const [isNameEditing, setIsNameEditing] = useState(false);

  const costsPlanned: { value: number; unit: string } | undefined = metaData.costsPlanned;
  const timePlannedDuration: string | undefined = metaData.timePlannedDuration;

  const modeler = useModelerStateStore((state) => state.modeler);
  useModelerStateStore((state) => state.changeCounter);

  const colorPickerPresets = [
    {
      label: 'Recommended',
      colors: [
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
        '#000000',
        '#FFFFFF',
      ],
    },
    {
      label: 'Recent',
      colors: [],
    },
  ];

  useEffect(() => {
    if (selectedElement) {
      setName(selectedElement.businessObject.name);
    }
  }, [selectedElement]);

  const handleNameChange = (event: FocusEvent<HTMLInputElement>) => {
    setIsNameEditing(false);
    const modeling = modeler!.getModeling();
    modeling.updateProperties(selectedElement as any, { name: event.target.value });
  };

  const updateBackgroundColor = (backgroundColor: string) => {
    const modeling = modeler!.getModeling();
    modeling.setColor(selectedElement as any, {
      fill: backgroundColor,
    });
  };
  const updateStrokeColor = (frameColor: string) => {
    const modeling = modeler!.getModeling();
    modeling.setColor(selectedElement as any, {
      stroke: frameColor,
    });
  };

  const updateMetaData = (
    name: string,
    value: any,
    attributes?: { [key: string]: any },
    oldAttributes?: { [key: string]: any },
  ) => {
    const modeling = modeler!.getModeling();

    if (name === 'property') {
      setProceedElement(
        selectedElement.businessObject,
        name,
        value.value,
        value.attributes,
        oldAttributes,
      );
    } else {
      setProceedElement(selectedElement.businessObject, name, value ? value : null, attributes);
    }
    modeling.updateProperties(selectedElement as any, {
      extensionElements: selectedElement.businessObject.extensionElements,
    });
  };

  return (
    <Space
      direction="vertical"
      size="large"
      style={{ width: '100%', fontSize: '0.75rem' }}
      className={styles.PropertiesPanel}
    >
      <Space
        direction="vertical"
        style={{ width: '100%' }}
        role="group"
        aria-labelledby="general-title"
      >
        <Divider>
          <span id="general-title" style={{ fontSize: '0.85rem' }}>
            General
          </span>
        </Divider>
        <Input
          name="Name"
          style={{ fontSize: '0.85rem' }}
          addonBefore="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleNameChange}
          disabled={selectedElement.type === 'bpmn:Process'}
          readOnly={!isNameEditing}
          suffix={
            selectedElement.type === 'bpmn:Process' || isNameEditing ? null : (
              <EditOutlined
                onClick={() => {
                  setIsNameEditing(true);
                }}
                data-testid="nameInputEdit"
              ></EditOutlined>
            )
          }
        />

        <Input name="Type" addonBefore="Type" value={selectedElement.type} disabled />

        <div
          style={{
            width: '75%',
            display: 'flex',
            justifyContent: 'center',
            margin: 'auto',
            marginTop: '1rem',
          }}
        >
          <ImageSelectionSection
            imageFileName={metaData.overviewImage && metaData.overviewImage.split('/images/').pop()}
            onImageUpdate={(imageFileName) => {
              updateMetaData('overviewImage', imageFileName);
            }}
          ></ImageSelectionSection>
        </div>
      </Space>

      <DescriptionSection selectedElement={selectedElement}></DescriptionSection>

      <MilestoneSelectionSection selectedElement={selectedElement}></MilestoneSelectionSection>

      <Space direction="vertical" style={{ width: '100%' }}>
        <Divider style={{ fontSize: '0.85rem' }}>Properties</Divider>
        <PlannedCostInput
          costsPlanned={
            costsPlanned
              ? { value: costsPlanned.value, currency: costsPlanned.unit }
              : { currency: 'EUR' }
          }
          onInput={({ value, currency }) => {
            updateMetaData('costsPlanned', value, { unit: currency });
          }}
        ></PlannedCostInput>
        <PlannedDurationInput
          onChange={(changedTimePlannedDuration) => {
            updateMetaData('timePlannedDuration', changedTimePlannedDuration);
          }}
          timePlannedDuration={timePlannedDuration || ''}
        ></PlannedDurationInput>
      </Space>

      <CustomPropertySection
        metaData={metaData}
        onChange={(name, value, oldName) => {
          updateMetaData(
            'property',
            { value: value, attributes: { name } },
            undefined,
            oldName
              ? {
                  name: oldName,
                }
              : undefined,
          );
        }}
      ></CustomPropertySection>

      {selectedElement.type !== 'bpmn:Process' && (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Divider style={{ fontSize: '0.85rem' }}>Colors</Divider>
          <Space>
            <ColorPicker
              size="small"
              disabledAlpha
              presets={colorPickerPresets}
              value={backgroundColor}
              onChange={(_, hex) => updateBackgroundColor(hex)}
            />
            <span>Background Colour</span>
          </Space>
          <Space>
            <ColorPicker
              size="small"
              disabledAlpha
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
  return breakpoint.xl ? (
    <ResizableElement
      initialWidth={400}
      minWidth={300}
      maxWidth={'30vw'}
      style={{
        // BPMN.io Symbol with 23 px height + 15 px offset to bottom (=> 38 px), Footer with 32px and Header with 64px, Padding of Toolbar 12px (=> Total 146px)
        height: 'calc(100vh - 150px)',
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
    <Modal
      open={isOpen}
      width={breakpoint.xs ? '100vw' : '75vw'}
      styles={{ body: { height: '75vh', overflowY: 'scroll', paddingRight: '1rem' } }}
      centered
      closeIcon={false}
      onCancel={close}
      onOk={close}
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
    </Modal>
  );
};

export default PropertiesPanel;
