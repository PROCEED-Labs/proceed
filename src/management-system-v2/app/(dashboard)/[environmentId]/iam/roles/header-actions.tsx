'use client';

import { PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, Modal, App } from 'antd';
import { FC, useEffect, useState } from 'react';
// import dayjs from 'dayjs';
// import germanLocale from 'antd/es/date-picker/locale/de_DE';
import { AuthCan, useEnvironment } from '@/components/auth-can';
import { addRole as serverAddRoles } from '@/lib/data/roles';
import { wrapServerCall } from '@/lib/wrap-server-call';
import useParseZodErrors, { antDesignInputProps } from '@/lib/useParseZodErrors';
import { RoleInputSchema } from '@/lib/data/role-schema';

const schema = RoleInputSchema.pick({ name: true, description: true });

const CreateRoleModal: FC<{
  modalOpen: boolean;
  close: () => void;
}> = ({ modalOpen, close }) => {
  const [form] = Form.useForm();
  const app = App.useApp();

  const [schemaErrors, parseInput] = useParseZodErrors(schema);

  const environment = useEnvironment();

  useEffect(() => {
    form.resetFields();
  }, [form, modalOpen]);

  const submitData = async (
    inputValues: Record<'name' | 'description' | 'expirationDayJs', 'post'>,
  ) => {
    // let expiration;
    // if (typeof values.expirationDayJs === 'object')
    //   expiration = (values.expirationDayJs as dayjs.Dayjs).toISOString();

    const values = parseInput(inputValues);
    if (!values) return;

    await wrapServerCall({
      fn: () =>
        serverAddRoles(environment.spaceId, {
          ...values,
          permissions: {},
          environmentId: environment.spaceId,
        }),
      onSuccess: false,
      app,
    });
  };

  return (
    <Modal open={modalOpen} onCancel={close} footer={null} title="Create New Role">
      <Form form={form} layout="vertical" onFinish={submitData}>
        <Form.Item label="Name" name="name" required {...antDesignInputProps(schemaErrors, 'name')}>
          <Input />
        </Form.Item>

        <Form.Item
          label="Description"
          name="description"
          {...antDesignInputProps(schemaErrors, 'description')}
        >
          <Input.TextArea />
        </Form.Item>

        {/**<Form.Item
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
        */}

        <Form.Item>
          <Button type="primary" htmlType="submit">
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

      <AuthCan create Role>
        <Button type="primary" onClick={() => setCreateRoleModalOpen(true)}>
          <PlusOutlined /> New Role
        </Button>
      </AuthCan>
    </>
  );
};

export default HeaderActions;
