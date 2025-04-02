'use client';

import React, { useEffect, useState } from 'react';
import {
  Modal,
  Form,
  Input,
  App,
  Typography,
  ModalProps,
  Carousel,
  Card,
  Flex,
  Alert,
  Collapse,
  Divider,
} from 'antd';
import { MdArrowBackIos, MdArrowForwardIos } from 'react-icons/md';
import { UserError } from '@/lib/user-error';
import { useAddControlCallback } from '@/lib/controls-store';
import './process-modal-carousel.css';
import Title from 'antd/es/typography/Title';
import { checkIfProcessExistsByName } from '@/lib/data/processes';
import { useEnvironment } from './auth-can';
import { useSession } from 'next-auth/react';
import { LazyBPMNViewer } from '@/components/bpmn-viewer';
import { usePathname } from 'next/navigation';

type ProcessModalProps<T extends { name: string; description: string }> = {
  open: boolean;
  title: string;
  okText?: string;
  onCancel: NonNullable<ModalProps['onCancel']>;
  onSubmit: (values: T[]) => Promise<{ error?: UserError } | void>;
  initialData?: T[];
  modalProps?: ModalProps;
  isImportModal?: boolean;
};

const ProcessModal = <
  T extends {
    name: string;
    description: string;
    userDefinedId?: string;
    creator?: string;
    creatorUsername?: string;
    createdOn?: string;
    bpmn?: string;
  },
>({
  open,
  title,
  okText,
  onCancel,
  onSubmit,
  initialData,
  modalProps,
  isImportModal,
}: ProcessModalProps<T>) => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const { message } = App.useApp();
  const [carouselIndex, setCarouselIndex] = useState(1);
  const [nameCollisions, setNameCollisions] = useState<
    { index: number; oldName: string; newName: string }[]
  >([]);
  const [showCollisions, setShowCollisions] = useState(true);
  const environment = useEnvironment();
  const session = useSession();
  const path = usePathname();
  const currentFolderId = path.includes('/folder/') ? path.split('/folder/').pop() : undefined;

  useEffect(() => {
    if (initialData) {
      // form.resetFields is not working, because initialData has not been
      // updated in the internal form store, eventhough the prop has.
      form.setFieldsValue(initialData);
    }
  }, [form, initialData]);

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
        setCarouselIndex(1);
        setNameCollisions([]);
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

  useEffect(() => {
    if (open && initialData && isImportModal) {
      validateImportedNames();
    }
  }, [open, initialData]);

  const validateImportedNames = async () => {
    if (!initialData || !isImportModal) return;

    const collisions: { index: number; oldName: string; newName: string }[] = [];

    for (let i = 0; i < initialData.length; i++) {
      const process = initialData[i];
      const exists = await checkIfProcessExistsByName({
        processName: process.name,
        spaceId: environment.spaceId,
        userId: session.data?.user.id!,
        folderId: currentFolderId,
      });

      if (exists) {
        const newName = `${process.name}_import_${new Date().toISOString()}`;
        collisions.push({ index: i, oldName: process.name, newName });
        initialData[i].name = newName;
      }
    }

    if (collisions.length > 0) {
      setNameCollisions(collisions);
      form.setFieldsValue(initialData);
      setShowCollisions(true);
    } else {
      setNameCollisions([]);
    }
  };

  return (
    <>
      <Modal
        title={
          <Flex justify="space-between" style={{ width: '100%', paddingRight: '25px' }}>
            <Title level={4} style={{ margin: 0 }}>
              {title}
            </Title>
            {initialData && initialData.length >= 1 && isImportModal && (
              <Typography.Text type="secondary">{`Process ${carouselIndex} of ${initialData.length}`}</Typography.Text>
            )}
          </Flex>
        }
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
          setNameCollisions([]);
        }}
        onOk={(e) => {
          modalProps?.onOk?.(e);
          onOk();
        }}
        styles={{
          body: {
            maxHeight: '85vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <div style={{ overflowY: 'auto', flex: 1 }} className="Hide-Scroll-Bar">
          {nameCollisions.length > 0 && showCollisions && (
            <Alert
              message={
                <>
                  <Collapse
                    size="small"
                    items={[
                      {
                        key: '1',
                        label: `${nameCollisions.length} process name${nameCollisions.length > 1 ? 's were' : ' was'} automatically renamed due to name conflict with existing process`,
                        children: (
                          <ul style={{ margin: 0, paddingLeft: 20 }}>
                            {nameCollisions.map((collision, i) => (
                              <li key={i}>
                                Process {collision.index + 1}: "{collision.oldName}" → "
                                {collision.newName}"
                              </li>
                            ))}
                          </ul>
                        ),
                      },
                    ]}
                  />
                </>
              }
              type="warning"
              showIcon
              closable
              style={{ marginBottom: 16 }}
              onClose={() => setShowCollisions(false)}
            />
          )}
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
              <ProcessInputs index={0} />
            ) : isImportModal ? (
              <Carousel
                arrows
                infinite={false}
                style={{ padding: '0px 25px 0px 25px' }}
                afterChange={(current) => setCarouselIndex(current + 1)}
                prevArrow={<MdArrowBackIos color="#000" />}
                nextArrow={<MdArrowForwardIos color="#000" />}
              >
                {initialData.map((process, index) => (
                  <Card key={index}>
                    <>
                      <LazyBPMNViewer previewBpmn={process.bpmn} reduceLogo={true} fitOnResize />
                      <Divider style={{ width: '100%', marginLeft: '-20%' }} />
                    </>
                    <ProcessInputsImport key={index} index={index} />
                  </Card>
                ))}
              </Carousel>
            ) : (
              <ProcessInputs index={0} initialName={initialData?.[0]?.name} />
            )}
          </Form>
        </div>
      </Modal>
    </>
  );
};

type ProcessInputsProps = {
  index: number;
  initialName?: string;
};

const ProcessInputs = ({ index, initialName }: ProcessInputsProps) => {
  const environment = useEnvironment();
  const session = useSession();
  const path = usePathname();
  const currentFolderId = path.includes('/folder/') ? path.split('/folder/').pop() : undefined;

  const validateProcessName = async (name: string, callback: Function, initialName?: string) => {
    if (!name) {
      callback(new Error('Please fill out the Process name'));
      return;
    }

    if (initialName && name === initialName) {
      callback();
      return;
    }

    const exists = await checkIfProcessExistsByName({
      processName: name,
      spaceId: environment.spaceId,
      userId: session.data?.user.id!,
      folderId: currentFolderId,
    });

    if (!exists) {
      callback();
      return;
    }

    callback(new Error('A process with this name already exists!'));
  };

  return (
    <>
      <Form.Item
        name={[index, 'name']}
        label="Process Name"
        validateDebounce={1000}
        hasFeedback
        rules={[
          { max: 100, message: 'Process name can be max 100 characters long' },
          { required: true, message: '' },
          {
            validator: (_, value) =>
              new Promise((resolve, reject) =>
                validateProcessName(
                  value,
                  (error?: Error) => (error ? reject(error) : resolve(true)),
                  initialName,
                ),
              ),
          },
        ]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name={[index, 'userDefinedId']}
        label="ID"
        rules={[
          { max: 50, message: 'ID can be max 50 characters long' },
          {
            required: false,
            message: 'Please enter a unique ID for the process.',
          },
          {},
        ]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name={[index, 'description']}
        label="Process Description"
        rules={[
          { max: 1000, message: 'Process description can be max 1000 characters long' },

          { required: false, message: 'Please fill out the Process description' },
        ]}
      >
        <Input.TextArea showCount rows={4} maxLength={150} />
      </Form.Item>
    </>
  );
};

const ProcessInputsImport = ({ index }: ProcessInputsProps) => {
  return (
    <>
      <ProcessInputs index={index} />
      <Form.Item name={[index, 'creator']} label="Original Creator" rules={[{ required: false }]}>
        <Input disabled />
      </Form.Item>
      <Form.Item
        name={[index, 'creatorUsername']}
        label="Original Creator Username"
        rules={[{ required: false }]}
      >
        <Input disabled />
      </Form.Item>
      <Form.Item
        name={[index, 'createdOn']}
        label="Original Creation Date"
        rules={[{ required: false }]}
      >
        <Input disabled />
      </Form.Item>
    </>
  );
};

export default ProcessModal;
