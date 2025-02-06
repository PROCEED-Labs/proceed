'use client';

import useModelerStateStore from './use-modeler-state-store';
import React, { FocusEvent, useEffect, useRef, useState } from 'react';
import styles from './properties-panel.module.scss';

import { Input, ColorPicker, Space, Grid, Divider, Modal } from 'antd';

import { CloseOutlined } from '@ant-design/icons';
import {
  getMetaDataFromElement,
  setDefinitionsName,
  setProceedElement,
  deepCopyElementById,
} from '@proceed/bpmn-helper';
import CustomPropertySection from './custom-property-section';
import MilestoneSelectionSection from './milestone-selection-section';
import ResizableElement, { ResizableElementRefType } from '@/components/ResizableElement';
import CollapsibleCard from '@/components/collapsible-card';
import ImageSelectionSection from './image-selection-section';
import PlannedDurationInput from './planned-duration-input';
import DescriptionSection from './description-section';

import PlannedCostInput from './planned-cost-input';
import { updateProcess } from '@/lib/data/processes';
import { useEnvironment } from '@/components/auth-can';
import { useRouter } from 'next/navigation';
import { getBackgroundColor, getBorderColor, getTextColor } from '@/lib/helpers/bpmn-js-helpers';
import { Shape } from 'bpmn-js/lib/model/Types';

type PropertiesPanelContentProperties = {
  selectedElement: Shape;
};

const PropertiesPanelContent: React.FC<PropertiesPanelContentProperties> = ({
  selectedElement,
}) => {
  const router = useRouter();
  const { spaceId } = useEnvironment();
  const metaData = getMetaDataFromElement(selectedElement.businessObject);
  const backgroundColor = getBackgroundColor(selectedElement);
  const textColor = getTextColor(selectedElement);
  const borderColor = getBorderColor(selectedElement);

  const [name, setName] = useState('');

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
      if (selectedElement.type === 'bpmn:Process') {
        const definitions = selectedElement.businessObject.$parent;
        setName(definitions.name);
      } else {
        setName(selectedElement.businessObject.name);
      }
    }
  }, [selectedElement]);

  const handleNameChange = async (event: FocusEvent<HTMLInputElement>) => {
    const modeling = modeler!.getModeling();

    if (selectedElement.type === 'bpmn:Process') {
      const definitions = selectedElement.businessObject.$parent;
      const bpmn = await modeler!.getXML();
      const newBpmn = (await setDefinitionsName(bpmn!, event.target.value)) as string;

      await updateProcess(
        definitions.id,
        spaceId,
        newBpmn as string,
        undefined,
        event.target.value,
        true,
      );
      definitions.name = event.target.value;
    } else {
      modeling.updateProperties(selectedElement as any, { name: event.target.value });
    }
  };

  const updateBackgroundColor = (backgroundColor: string) => {
    const modeling = modeler!.getModeling();
    modeling.setColor(selectedElement as any, {
      fill: backgroundColor,
    });
  };
  const updateTextColor = (textColor: string) => {
    const modeling = modeler!.getModeling();
    // update the text color in the external label if one exists, otherwise update the text inside
    // the element if possible
    let element = selectedElement.label || selectedElement;
    if (element) {
      modeling.updateModdleProperties(element as any, element.di.label, {
        color: textColor,
      });
    }
  };
  const updateBorderColor = (borderColor: string) => {
    const modeling = modeler!.getModeling();
    modeling.updateProperties(selectedElement as any, {
      di: { 'border-color': borderColor },
    });
  };

  const updateMetaData = async (
    name: string,
    value: any,
    attributes?: { [key: string]: any },
    oldAttributes?: { [key: string]: any },
  ) => {
    const modeling = modeler!.getModeling();
    const bpmn = await modeler!.getXML();

    // create deep copy of selected element and set proceed element in this object so that bpmn.js event system can recognise changes in object
    const selectedElementCopy = (await deepCopyElementById(bpmn!, selectedElement.id)) as any;

    if (name === 'property') {
      setProceedElement(selectedElementCopy, name, value.value, value.attributes, oldAttributes);
    } else {
      setProceedElement(selectedElementCopy, name, value ? value : null, attributes);
    }
    modeling.updateProperties(selectedElement as any, {
      extensionElements: selectedElementCopy.extensionElements,
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
          placeholder="Element Name"
          style={{ fontSize: '0.85rem' }}
          addonBefore="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleNameChange}
        />

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

      {selectedElement.type !== 'bpmn:Process' && selectedElement.type !== 'bpmn:Collaboration' && (
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
            <span>Background Color</span>
          </Space>
          <Space>
            <ColorPicker
              size="small"
              disabledAlpha
              presets={colorPickerPresets}
              value={borderColor}
              onChange={(_, hex) => updateBorderColor(hex)}
            />
            <span>Border Color</span>
          </Space>

          {selectedElement?.di?.label && (
            <Space>
              <ColorPicker
                size="small"
                disabledAlpha
                presets={colorPickerPresets}
                value={textColor}
                onChange={(_, hex) => updateTextColor(hex)}
              />
              <span>Text Color</span>
            </Space>
          )}
        </Space>
      )}
    </Space>
  );
};

type PropertiesPanelProperties = {
  selectedElement: Shape;
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
        className={styles.PropertiesPanelCollapsibleCard}
        show={showInfo}
        onCollapse={() => {
          //  set width of parent component (resizable element) to 40 which is the desired with of the collapsed card
          if (resizableElementRef.current) {
            if (showInfo) {
              resizableElementRef.current({ width: 40, minWidth: 40, maxWidth: 40 });
            } else {
              resizableElementRef.current({ width: 400, minWidth: 300, maxWidth: '30vw' });
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
