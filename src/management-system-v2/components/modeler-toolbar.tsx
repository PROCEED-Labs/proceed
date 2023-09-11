'use client';

import React, { useEffect, useState } from 'react';

import type ElementRegistry from 'diagram-js/lib/core/ElementRegistry';

import { Row, Col, Tooltip, Button, Modal, Form, Input } from 'antd';
import { Toolbar, ToolbarGroup } from './toolbar';
import type { FormInstance } from 'antd';

import Icon, {
  FormOutlined,
  ExportOutlined,
  EyeOutlined,
  SettingOutlined,
  PlusOutlined,
} from '@ant-design/icons';

import { SvgXML, SvgShare } from '@/components/svg';

import PropertiesPanel from './properties-panel';

import useModelerStateStore from '@/lib/use-modeler-state-store';
import { useParams } from 'next/navigation';
import { useProcess } from '@/lib/process-queries';
import { createNewProcessVersion } from '@/lib/helpers';

const VersionSubmitButton = ({ form, onSubmit }: { form: FormInstance; onSubmit: Function }) => {
  const [submittable, setSubmittable] = useState(false);

  // Watch all values
  const values = Form.useWatch([], form);

  React.useEffect(() => {
    form.validateFields({ validateOnly: true }).then(
      () => {
        setSubmittable(true);
      },
      () => {
        setSubmittable(false);
      }
    );
  }, [form, values]);

  return (
    <Button
      type="primary"
      htmlType="submit"
      disabled={!submittable}
      onClick={() => {
        onSubmit(values);
        form.resetFields();
      }}
    >
      Create Version
    </Button>
  );
};

type ModelerToolbarProps = {};
const ModelerToolbar: React.FC<ModelerToolbarProps> = () => {
  /* ICONS: */
  const svgXML = <Icon component={SvgXML} />;
  const svgShare = <Icon component={SvgShare} />;

  const [showPropertiesPanel, setShowPropertiesPanel] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);

  const [form] = Form.useForm();

  const modeler = useModelerStateStore((state) => state.modeler);
  const selectedElementId = useModelerStateStore((state) => state.selectedElementId);
  const setVersions = useModelerStateStore((state) => state.setVersions);

  // const [index, setIndex] = useState(0);
  const { processId } = useParams();

  const { isSuccess, data: processData, refetch: refetchProcess } = useProcess(processId);

  let selectedElement;

  if (modeler) {
    const elementRegistry = modeler.get('elementRegistry') as ElementRegistry;

    selectedElement = selectedElementId
      ? elementRegistry.get(selectedElementId)!
      : elementRegistry.getAll().filter((el) => el.businessObject.$type === 'bpmn:Process')[0];
  }

  const createProcessVersion = async (values: {
    versionName: string;
    versionDescription: string;
  }) => {
    setIsVersionModalOpen(false);
    const saveXMLResult = await modeler?.saveXML({ format: true });

    if (saveXMLResult?.xml) {
      await createNewProcessVersion(
        saveXMLResult.xml,
        values.versionName,
        values.versionDescription
      );
      refetchProcess();
    }
  };
  const handlePropertiesPanelToggle = () => {
    setShowPropertiesPanel(!showPropertiesPanel);
  };

  useEffect(() => {
    if (isSuccess) {
      setVersions(processData.versions);
    }
  }, [isSuccess, processData, setVersions]);

  return (
    <>
      <Toolbar>
        <Row justify="end">
          <Col>
            <ToolbarGroup>
              {/* <Button>Test</Button>
              <Button
                icon={showPropertiesPanel ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                onClick={handlePropertiesPanelToggle}
              /> */}
              <Tooltip title="Edit Process Constraints">
                <Button icon={<FormOutlined />}></Button>
              </Tooltip>
              <Tooltip title="Show XML">
                <Button icon={svgXML}></Button>
              </Tooltip>
              <Tooltip title="Export">
                <Button icon={<ExportOutlined />}></Button>
              </Tooltip>
              <Tooltip title="Hide Non-Executeable Elements">
                <Button icon={<EyeOutlined />}></Button>
              </Tooltip>
              <Tooltip
                title={showPropertiesPanel ? 'Close Properties Panel' : 'Open Properties Panel'}
              >
                <Button icon={<SettingOutlined />} onClick={handlePropertiesPanelToggle}></Button>
              </Tooltip>
              <Tooltip title="Share">
                <Button icon={svgShare}></Button>
              </Tooltip>
              <Tooltip title="Create New Version">
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setIsVersionModalOpen(true);
                  }}
                ></Button>
              </Tooltip>
            </ToolbarGroup>
            {showPropertiesPanel && <div style={{ width: '650px' }}></div>}
          </Col>
          {/* {showPropertiesPanel && <Col></Col>} */}
          {showPropertiesPanel && selectedElement && (
            <>
              <PropertiesPanel selectedElement={selectedElement} setOpen={setShowPropertiesPanel} />
            </>
          )}
        </Row>
      </Toolbar>
      {/* {showPropertiesPanel && selectedElement && (
        <PropertiesPanel selectedElement={selectedElement} setOpen={setShowPropertiesPanel} />
      )} */}
      <Modal
        title="Create new Version"
        open={isVersionModalOpen}
        onCancel={() => {
          setIsVersionModalOpen(false);
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setIsVersionModalOpen(false);
            }}
          >
            Cancel
          </Button>,
          <VersionSubmitButton
            key="submit"
            form={form}
            onSubmit={createProcessVersion}
          ></VersionSubmitButton>,
        ]}
      >
        <Form form={form} name="versioning" wrapperCol={{ span: 24 }} autoComplete="off">
          <Form.Item
            name="versionName"
            rules={[{ required: true, message: 'Please input the Version Name!' }]}
          >
            <Input placeholder="Version Name" />
          </Form.Item>
          <Form.Item
            name="versionDescription"
            rules={[{ required: true, message: 'Please input the Version Description!' }]}
          >
            <Input.TextArea
              showCount
              maxLength={150}
              style={{ height: 100 }}
              placeholder="Version Description"
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default ModelerToolbar;
