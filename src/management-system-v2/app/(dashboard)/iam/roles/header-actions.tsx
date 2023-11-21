'use client';

import { usePostAsset } from '@/lib/fetch-data';
import { PlusOutlined } from '@ant-design/icons';
import { Button, Form, App, Input, Modal, DatePicker } from 'antd';
import { FC, ReactNode, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import germanLocale from 'antd/es/date-picker/locale/de_DE';
import { useRouter } from 'next/navigation';
import { AuthCan } from '@/lib/clientAuthComponents';

type PostRoleKeys = 'name' | 'description' | 'expiration';

const CreateRoleModal: FC<{
  modalOpen: boolean;
  close: () => void;
}> = ({ modalOpen, close }) => {
  const [form] = Form.useForm();
  const router = useRouter();
  const { message: messageApi } = App.useApp();
  type ErrorsObject = { [field in PostRoleKeys]?: ReactNode[] };
  const [formatError, setFormatError] = useState<ErrorsObject>({});
  const { mutateAsync: postRole, isLoading } = usePostAsset('/roles', {
    onError(e) {
      if (!(typeof e === 'object' && e !== null && 'errors' in e)) {
        return;
      }

      const errors: { [key in PostRoleKeys]?: ReactNode[] } = {};

      function appendError(key: PostRoleKeys, error: string) {
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

  const [submittable, setSubmittable] = useState(false);
  const values = Form.useWatch('name', form);

  useEffect(() => {
    form.validateFields({ validateOnly: true }).then(
      () => {
        setSubmittable(true);
      },
      () => {
        setSubmittable(false);
      },
    );
  }, [form, values]);

  useEffect(() => {
    form.resetFields();
    setFormatError({});
  }, [form, modalOpen]);

  const submitData = async (values: Record<'name' | 'description' | 'expirationDayJs', 'post'>) => {
    let expiration;
    if (typeof values.expirationDayJs === 'object')
      expiration = (values.expirationDayJs as dayjs.Dayjs).toISOString();

    try {
      const newRole = await postRole({
        body: {
          name: values.name,
          description: values.description,
          expiration,
        },
      });
      messageApi.success({ content: 'Role created' });
      router.push(`/iam/roles/${newRole.id}`);
    } catch (e) {
      messageApi.error({ content: 'Something went wrong' });
    }
  };

  return (
    <Modal open={modalOpen} onCancel={close} footer={null} title="Create New Role">
      <Form form={form} layout="vertical" onFinish={submitData}>
        <Form.Item
          label="Name"
          name="name"
          help={formatError.name}
          validateStatus={formatError.name && 'error'}
          rules={[{ required: true, message: 'This field is required' }]}
          required
        >
          <Input />
        </Form.Item>

        <Form.Item
          label="Description"
          name="description"
          help={formatError.description}
          validateStatus={formatError.description && 'error'}
        >
          <Input.TextArea />
        </Form.Item>

        <Form.Item
          label="Expiration"
          name="expirationDayJs"
          help={formatError.expiration}
          validateStatus={formatError.expiration && 'error'}
        >
          <DatePicker
            // NOTE german locale hard coded
            locale={germanLocale}
            allowClear={true}
          />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={isLoading} disabled={!submittable}>
            Create Role
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

      <AuthCan action="create" resource="Role">
        <Button type="primary" onClick={() => setCreateRoleModalOpen(true)}>
          <PlusOutlined /> Create Role
        </Button>
      </AuthCan>
    </>
  );
};

export default HeaderActions;
