'use client';

import React, { useEffect, useState } from 'react';
import {
  Modal,
  Form,
  Input,
  App,
  Collapse,
  CollapseProps,
  Typography,
  ModalProps,
  Select,
  Button,
  Space,
} from 'antd';
import { UserError } from '@/lib/user-error';
import { useAddControlCallback } from '@/lib/controls-store';
import { LazyBPMNViewer } from './bpmn-viewer';
import Search from 'antd/es/input/Search';
import { Template } from './processes';

type ProcessModalProps<T extends { name: string; description: string; templateId?: string }> = {
  open: boolean;
  title: string;
  okText?: string;
  onCancel: NonNullable<ModalProps['onCancel']>;
  onSubmit: (values: T[]) => Promise<{ error?: UserError } | void>;
  initialData?: T[];
  templates?: any[];
  modalProps?: ModalProps;
  type?: 'process' | 'template';
};

const ProcessModal = <T extends { name: string; description: string; templateId?: string }>({
  open,
  title,
  okText,
  onCancel,
  onSubmit,
  initialData,
  templates = [],
  modalProps,
  type = 'process',
}: ProcessModalProps<T>) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const { message } = App.useApp();

  useEffect(() => {
    if (initialData) {
      // form.resetFields is not working, because initialData has not been
      // updated in the internal form store, eventhough the prop has.
      form.setFieldsValue(initialData);
    }
  }, [form, initialData]);

  const items: CollapseProps['items'] =
    (initialData?.length ?? 0) > 1
      ? initialData?.map((data, index) => ({
          label: data.name,
          children: <ProcessInputs index={index} />,
        }))
      : undefined;

  const onOk = async () => {
    try {
      // form.validateFields() only contains field values (that have been
      // rendered), so we have to merge with initalData. If you only open
      // the third accordion item, the object would look like this:
      // { 2: { definitionName: 'test', description: 'test' } }
      const values = Object.entries(await form.validateFields()) as any[];
      const mergedValues = (initialData ?? [{}]).map((value, index) => ({
        ...value,
        ...values.find(([key]) => key === index.toString())?.[1],
      }));

      // Let the parent of this modal handle the submission.
      setSubmitting(true);
      try {
        const res = await onSubmit(mergedValues);
        if (res?.error) {
          // UserError was thrown by the server
          message.open({ type: 'error', content: res.error.message });
        }
      } catch (e) {
        // Unkown server error or was not sent from server (e.g. network error)
        message.open({
          type: 'error',
          content: 'Someting went wrong while submitting the data',
        });
      }
      setSubmitting(false);
    } catch (info) {
      // Validate Failed
    }
  };

  useAddControlCallback(
    'process-list',
    [
      'selectall',
      'esc',
      'del',
      'copy',
      'paste',
      'enter',
      'cut',
      'export',
      'import',
      'shift+enter',
      'new',
    ],
    (e) => {
      // e.preventDefault();
    },
    { level: 2, blocking: open },
  );
  useAddControlCallback(
    'process-list',
    'control+enter',
    () => {
      if (open) onOk();
    },
    { level: 2, blocking: open, dependencies: [open] },
  );

  const handleTemplateSelection = (index: number, templateId: string) => {
    form.setFieldValue([index, 'templateId'], templateId);
  };

  return (
    <Modal
      title={title}
      open={open}
      width={600}
      centered
      // IMPORTANT: This prevents a modal being stored for every row in the
      // table.
      destroyOnClose
      okButtonProps={{ loading: submitting }}
      okText={okText}
      wrapProps={{ onDoubleClick: (e: MouseEvent) => e.stopPropagation() }}
      {...modalProps}
      onCancel={(e) => {
        modalProps?.onCancel?.(e);
        onCancel(e);
      }}
      onOk={(e) => {
        modalProps?.onOk?.(e);
        onOk();
      }}
    >
      <Form
        form={form}
        layout="vertical"
        name="process_form"
        initialValues={initialData}
        autoComplete="off"
        // This resets the fields when the modal is opened again. (apparently
        // doesn't work in production, that's why we use the useEffect above)
        preserve={false}
      >
        {!initialData ? (
          <ProcessCreationInputs
            type={type}
            index={0}
            templates={templates}
            handleTemplateSelection={handleTemplateSelection}
          />
        ) : initialData.length === 1 ? (
          <ProcessInputs type={type} index={0} />
        ) : (
          <Collapse style={{ maxHeight: '60vh', overflowY: 'scroll' }} accordion items={items} />
        )}
      </Form>
    </Modal>
  );
};

type ProcessInputsProps = {
  index: number;
  type?: 'process' | 'template';
};

type ProcessCreationInputsProps = {
  index: number;
  type?: 'process' | 'template';
  templates?: Template[];
  handleTemplateSelection?: (index: number, templateId: string) => void;
};

const ProcessInputs = ({ index, type = 'process' }: ProcessInputsProps) => {
  const capatilizedType = type.charAt(0).toUpperCase() + type.slice(1); // Process or Template

  return (
    <>
      <Form.Item
        name={[index, 'name']}
        label={`${capatilizedType} Name`}
        rules={[
          {
            required: true,
            message: `Please fill out the ${capatilizedType} name`,
          },
        ]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name={[index, 'description']}
        label={`${capatilizedType} Description`}
        rules={[
          {
            required: false,
            message: `Please fill out the ${capatilizedType} description`,
          },
        ]}
      >
        <Input.TextArea showCount rows={4} maxLength={150} />
      </Form.Item>
    </>
  );
};

const ProcessCreationInputs = ({
  index,
  type,
  templates = [],
  handleTemplateSelection,
}: ProcessCreationInputsProps) => {
  const [selectedTemplate, setSelectedTemplate] = React.useState<Template | null>(null);
  const [filteredTemplates, setFilteredTemplates] = React.useState(templates);

  const handleSearch = (value: string) => {
    const filtered = templates.filter((template) =>
      template.name.toLowerCase().includes(value.toLowerCase()),
    );
    setFilteredTemplates(filtered);
  };

  return (
    <>
      <ProcessInputs index={index} type={type} />
      {type === 'process' && (
        <>
          {/* <Search
            placeholder="input search text"
            onSearch={handleSearch}
            style={{ width: '100%' }}
            value={selectedTemplate?.id}
          /> */}
          <Form.Item name={[index, 'templateId']} label="Template">
            <Input />
          </Form.Item>

          {/* Horizontal Scrollable Template Selection */}
          <div style={{ width: '100%', overflowX: 'auto', minHeight: '220px' }}>
            <Space
              style={{
                display: 'flex',
                overflowX: 'auto',
                whiteSpace: 'nowrap',
                padding: '8px 0',
                gap: '8px',
                flexWrap: 'nowrap',
                scrollbarWidth: 'thin',
              }}
            >
              {filteredTemplates.length > 0 ? (
                filteredTemplates.map((template) => (
                  <Button
                    type="default"
                    key={template.id}
                    className="template-button"
                    onClick={() => {
                      setSelectedTemplate(template);
                      handleTemplateSelection ? handleTemplateSelection(index, template.id) : null;
                    }}
                    style={{
                      backgroundColor: selectedTemplate?.id === template.id ? '#dcf0fa' : 'white',
                      color: selectedTemplate?.id === template.id ? 'white' : 'black',
                      border: '1px solid #d9d9d9',
                      minWidth: '200px',
                      maxWidth: '200px',
                      height: '200px',
                      padding: '10px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    <LazyBPMNViewer definitionId={template.id} reduceLogo fitOnResize />
                    <Typography.Text>{template.name}</Typography.Text>
                  </Button>
                ))
              ) : (
                <Typography.Text type="secondary" style={{ padding: '10px' }}>
                  No matching templates found
                </Typography.Text>
              )}
            </Space>
          </div>
        </>
      )}
    </>
  );
};

export default ProcessModal;
