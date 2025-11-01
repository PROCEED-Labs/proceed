'use client';

import useModelerStateStore from './use-modeler-state-store';
import React, { FocusEvent, use, useEffect, useRef, useState } from 'react';
import styles from './properties-panel.module.scss';

import { Input, ColorPicker, Space, Grid, Divider, Modal, Tabs, message } from 'antd';
import type { TabsProps } from 'antd';
import type { ElementLike } from 'diagram-js/lib/core/Types';

import { CloseOutlined } from '@ant-design/icons';
import {
  getMetaDataFromElement,
  setProceedElement,
  deepCopyElementById,
  setDefinitionsName,
} from '@proceed/bpmn-helper';
import CustomPropertySection from './custom-property-section';
import MilestoneSelectionSection from './milestone-selection-section';
import ResizableElement, { ResizableElementRefType } from '@/components/ResizableElement';
import CollapsibleCard from '@/components/collapsible-card';
import ImageSelectionSection from './image-selection-section';
import PlannedDurationInput from './planned-duration-input';
import DescriptionSection from './description-section';

import PlannedCostInput from './planned-cost-input';
import { checkIfProcessExistsByName, updateProcessMetaData } from '@/lib/data/processes';
import { useEnvironment } from '@/components/auth-can';
import {
  PotentialOwner,
  ResponsibleParty,
} from '../../../../../components/competence/potential-owner/potential-owner';
import { EnvVarsContext } from '@/components/env-vars-context';
import { getBackgroundColor, getBorderColor, getTextColor } from '@/lib/helpers/bpmn-js-helpers';
import { Element, Shape } from 'bpmn-js/lib/model/Types';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { BPMNCanvasRef } from '@/components/bpmn-canvas';
import VariableDefinition from './variable-definition';
import SuggestPotentialOwner from '@/components/competence/potential-owner/suggest-potential-owner';

// Elements that should not display the planned duration field
// These are non-executable elements that don't have execution time
const ELEMENTS_WITHOUT_PLANNED_DURATION = [
  // Start events are instantaneous
  'bpmn:StartEvent',
  // Artifacts - documentation and data elements that don't execute
  'bpmn:TextAnnotation',
  'bpmn:DataObject',
  'bpmn:DataObjectReference',
  'bpmn:DataStore',
  'bpmn:DataStoreReference',
  'bpmn:Group',
  'bpmn:Association',
  // Organizational elements - containers, not executable elements
  'bpmn:Participant',
  'bpmn:Lane',
  'bpmn:LaneSet',
];

type PropertiesPanelContentProperties = {
  selectedElement: ElementLike;
};

export const updateMetaData = async (
  modeler: BPMNCanvasRef,
  element: ElementLike,
  name: string,
  value: any,
  attributes?: { [key: string]: any },
  oldAttributes?: { [key: string]: any },
) => {
  const modeling = modeler.getModeling();
  const bpmn = await modeler.getXML();

  // create deep copy of selected element and set proceed element in this object so that bpmn.js event system can recognise changes in object
  const selectedElementCopy = (await deepCopyElementById(bpmn!, element.id)) as any;

  if (name === 'property') {
    setProceedElement(selectedElementCopy, name, value.value, value.attributes, oldAttributes);
  } else {
    setProceedElement(selectedElementCopy, name, value ? value : null, attributes);
  }
  modeling.updateProperties(element as any, {
    extensionElements: selectedElementCopy.extensionElements,
  });
};

const PropertiesPanelContent: React.FC<PropertiesPanelContentProperties> = ({
  selectedElement,
}) => {
  const env = use(EnvVarsContext);
  const environment = useEnvironment();

  const { spaceId } = useEnvironment();
  const { data: session } = useSession();
  const path = usePathname();
  const currentFolderId = path.includes('/folder/') ? path.split('/folder/').pop() : undefined;

  const metaData = getMetaDataFromElement(selectedElement.businessObject);
  const backgroundColor = getBackgroundColor(selectedElement as Shape);
  const textColor = getTextColor(selectedElement as Shape);
  const borderColor = getBorderColor(selectedElement as Shape);

  const [name, setName] = useState('');
  const [userDefinedId, setUserDefinedId] = useState(metaData.userDefinedId);

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
        setUserDefinedId(definitions.userDefinedId);
      } else {
        setName(selectedElement.businessObject.name);
      }
    }
  }, [selectedElement]);

  const handleNameChange = async (event: FocusEvent<HTMLInputElement>) => {
    const modeling = modeler!.getModeling();

    if (selectedElement.type === 'bpmn:Process') {
      const definitions = selectedElement.businessObject.$parent;
      // prevent empty process name
      if (!event.target.value || event.target.value === definitions.name) {
        setName(definitions.name);
        return;
      }
      // check if the process name already exists in the folder scope
      if (
        await checkIfProcessExistsByName({
          batch: false,
          processName: event.target.value,
          spaceId: spaceId,
          userId: session?.user.id!,
          folderId: currentFolderId,
        })
      ) {
        message.error(
          `A process with the name ${event.target.value} already exists in current folder`,
        );
        setName(definitions.name);
        return;
      }

      await updateProcessMetaData(definitions.id, spaceId, { name: event.target.value }, true);

      definitions.name = event.target.value;
    } else {
      modeling.updateProperties(selectedElement as any, { name: event.target.value });
    }
  };

  const handleUserDefinedIdChange = async (event: FocusEvent<HTMLInputElement>) => {
    if (selectedElement.type === 'bpmn:Process') {
      const definitions = selectedElement.businessObject.$parent;
      await updateProcessMetaData(
        definitions.id,
        spaceId,
        { userDefinedId: event.target.value },
        true,
      );
      definitions.userDefinedId = event.target.value;
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

  /* TABS: */
  const [activeTab, setActiveTab] = useState('Property-Panel-General');

  const changeToTab = (key: string) => {
    setActiveTab(key);
  };

  const tabs: TabsProps['items'] = [
    {
      key: 'Property-Panel-General',
      label: 'General Properties',
      children: (
        <>
          <Space
            direction="vertical"
            style={{ width: '100%' }}
            role="group"
            aria-labelledby="general-title"
            aria-label="General Properties"
          >
            {/* <Divider>
          <span id="general-title" style={{ fontSize: '0.85rem' }}>
            General
          </span>
        </Divider> */}
            <Input
              name="Name"
              placeholder="Element Name"
              style={{ fontSize: '0.85rem' }}
              addonBefore="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleNameChange}
            />

            {selectedElement.type === 'bpmn:Process' && (
              <Input
                name="ID"
                placeholder="User Defined ID"
                style={{ fontSize: '0.85rem' }}
                addonBefore="ID"
                value={userDefinedId}
                onChange={(e) => setUserDefinedId(e.target.value)}
                onBlur={handleUserDefinedIdChange}
              />
            )}

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
                imageFilePath={metaData.overviewImage}
                onImageUpdate={(imageFileName) => {
                  updateMetaData(modeler!, selectedElement, 'overviewImage', imageFileName);
                }}
              ></ImageSelectionSection>
            </div>
          </Space>
          <DescriptionSection selectedElement={selectedElement}></DescriptionSection>
          {/* Responsibility */}
          <ResponsibleParty selectedElement={selectedElement} modeler={modeler} />
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
                updateMetaData(modeler!, selectedElement, 'costsPlanned', value, {
                  unit: currency,
                });
              }}
            ></PlannedCostInput>
            {!ELEMENTS_WITHOUT_PLANNED_DURATION.includes(selectedElement.type) && (
              <PlannedDurationInput
                onChange={(changedTimePlannedDuration) => {
                  updateMetaData(
                    modeler!,
                    selectedElement,
                    'timePlannedDuration',
                    changedTimePlannedDuration,
                  );
                }}
                timePlannedDuration={timePlannedDuration || ''}
              ></PlannedDurationInput>
            )}
          </Space>

          <CustomPropertySection
            metaData={metaData}
            onChange={(name, value, oldName) => {
              updateMetaData(
                modeler!,
                selectedElement,
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

          {selectedElement.type !== 'bpmn:Process' &&
            selectedElement.type !== 'bpmn:Collaboration' && (
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
        </>
      ),
    },
  ];

  if (env.PROCEED_PUBLIC_PROCESS_AUTOMATION_ACTIVE) {
    tabs.push({
      key: 'Property-Panel-Execution',
      label: 'Automation Properties',
      children: (
        <>
          <Space
            direction="vertical"
            style={{ width: '100%' }}
            role="group"
            aria-labelledby="general-title"
          >
            {selectedElement.type === 'bpmn:UserTask' && (
              <>
                <PotentialOwner selectedElement={selectedElement} modeler={modeler} />
                <SuggestPotentialOwner selectedElement={selectedElement} modeler={modeler} />
                <Divider />
              </>
            )}
            <VariableDefinition />
          </Space>
        </>
      ),
    });
  }
  /* ---- */

  return (
    <>
      <Space
        direction="vertical"
        size="large"
        style={{ width: '100%', fontSize: '0.75rem', marginTop: '-40px' }}
        className={styles.PropertiesPanel}
      >
        <Tabs
          defaultActiveKey={activeTab}
          items={tabs}
          onChange={changeToTab}
          activeKey={activeTab}
        />
      </Space>
    </>
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
