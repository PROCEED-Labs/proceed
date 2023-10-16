'use client';

import { ApiRequestBody, usePostAsset } from '@/lib/fetch-data';
import { AuthCan } from '@/lib/iamComponents';
import { PlusOutlined } from '@ant-design/icons';
import { Button, Form, App, Input, Modal, DatePicker } from 'antd';
import { FC, ReactNode, useState } from 'react';
import { Dayjs } from 'dayjs';

import germanLocale from 'antd/es/date-picker/locale/de_DE';
import { useRouter } from 'next/navigation';

type RoleRequestBody = ApiRequestBody<'/roles', 'post'>;

const CreateRoleModal: FC<{
  modalOpen: boolean;
  close: () => void;
}> = ({ modalOpen, close }) => {
  const [form] = Form.useForm();
  const router = useRouter();
  const { message: messageApi } = App.useApp();
  type ErrorsObject = Partial<{ [field in keyof RoleRequestBody]?: ReactNode[] }>;
  const [formatError, setFormatError] = useState<ErrorsObject>({});

  const { mutateAsync: postRole, isLoading } = usePostAsset('/roles', {
    onError(e) {
      if (!(typeof e === 'object' && e !== null && 'errors' in e)) {
        return;
      }

      const errors: ErrorsObject = {};

      function appendError(key: keyof RoleRequestBody, error: string) {
        if (key in errors) {
          errors[key]!.push(<p key={errors[key]?.length}>{error}</p>);
        } else {
          errors[key] = [<p key={0}>{error}</p>];
        }
      }

      for (const error of e.errors as string[]) {
        if (error.includes('name')) appendError('name', error);
        else if (error.includes('description')) appendError('description', error);
        else if (error.includes('expiration')) appendError('expiration', error);
      }

      setFormatError(errors);
    },
  });

  const submitData = async () => {
    try {
      type FormData = {
        name: string;
        description?: string;
        expiration?: Dayjs;
      };
      const values: FormData = await form.validateFields();

      const response = await postRole({
        body: {
          name: values.name,
          description: values.description,
          expiration: values.expiration ? values.expiration.toISOString() : undefined,
        },
      });

      if (response.id && typeof response.id === 'string') router.push(`/iam/roles/${response.id}`);

      messageApi.success({ content: 'Role created' });
      close();
    } catch (e) {
      messageApi.error({ content: 'An error ocurred' });
    }
  };

  return (
    <Modal open={modalOpen} onCancel={close} footer={null} title="Create a new role">
      <Form form={form} layout="vertical" onFinish={submitData}>
        <Form.Item
          name="name"
          label="Role Name"
          rules={[{ required: true, message: 'Please the role name' }]}
          help={'name' in formatError ? formatError['name'] : ''}
          validateStatus={'name' in formatError ? 'error' : ''}
          hasFeedback
          required
        >
          <Input />
        </Form.Item>

        <Form.Item
          name="description"
          label="Description"
          help={'description' in formatError ? formatError['description'] : ''}
          validateStatus={'description' in formatError ? 'error' : ''}
          hasFeedback
        >
          <Input.TextArea />
        </Form.Item>

        <Form.Item
          name="expiration"
          label="Expiration"
          help={'expiration' in formatError ? formatError['expiration'] : ''}
          validateStatus={'expiration' in formatError ? 'error' : ''}
          hasFeedback
        >
          <DatePicker locale={germanLocale} />
        </Form.Item>

        <Form.Item>
          <Button type="primary" onClick={submitData} loading={isLoading}>
            Submit
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

const HeaderActions: FC = () => {
  const [createRoleModalOpen, setCreateRoleModalOpen] = useState(false);

  return (
    <>
      <CreateRoleModal
        modalOpen={createRoleModalOpen}
        close={() => setCreateRoleModalOpen(false)}
      />

      <AuthCan action="create" resource="User">
        <Button type="primary" onClick={() => setCreateRoleModalOpen(true)}>
          <PlusOutlined /> Create
        </Button>
      </AuthCan>
    </>
  );
};

export default HeaderActions;
