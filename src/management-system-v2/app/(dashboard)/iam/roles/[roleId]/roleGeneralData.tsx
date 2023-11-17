'use client';

import { toCaslResource } from '@/lib/ability/caslAbility';
import { useGetAsset, usePutAsset } from '@/lib/fetch-data';
import { Alert, App, Button, DatePicker, Form, Input, Spin } from 'antd';
import { FC, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import germanLocale from 'antd/es/date-picker/locale/de_DE';
import { useAbilityStore } from '@/lib/abilityStore';

const RoleGeneralData: FC<{ roleId: string }> = ({ roleId }) => {
  const { message } = App.useApp();
  const ability = useAbilityStore((store) => store.ability);
  const [form] = Form.useForm();

  const { data, isLoading, error } = useGetAsset('/roles/{id}', {
    params: { path: { id: roleId } },
  });

  const { mutateAsync: updateRole, isLoading: putLoading } = usePutAsset('/roles/{id}', {
    onError: () => message.open({ type: 'error', content: 'Something went wrong' }),
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

  if (isLoading || error || !data) return <Spin />;

  const role = toCaslResource('Role', data);

  async function submitChanges(values: Record<string, any>) {
    if (typeof values.expirationDayJs === 'object') {
      values.expiration = (values.expirationDayJs as dayjs.Dayjs).toISOString();
      delete values.expirationDayJs;
    }

    try {
      await updateRole({
        params: { path: { id: roleId } },
        body: values,
      });

      // success message has to go here, or else the mutation will stop loading when the message
      // disappears
      message.open({ type: 'success', content: 'Role updated' });
    } catch (e) {}
  }

  return (
    <Form form={form} layout="vertical" onFinish={submitChanges} initialValues={role}>
      {role.note && (
        <>
          <Alert type="warning" message={role.note} />
          <br />
        </>
      )}

      <Form.Item
        label="Name"
        name="name"
        rules={[{ required: true, message: 'this field is required' }]}
        required
      >
        <Input placeholder="input placeholder" disabled={!ability.can('update', role, 'name')} />
      </Form.Item>

      <Form.Item label="Description" name="description">
        <Input.TextArea
          placeholder="input placeholder"
          disabled={!ability.can('update', role, 'description')}
        />
      </Form.Item>

      <Form.Item label="Expiration" name="expirationDayJs">
        <DatePicker
          // Note german locale hard coded
          locale={germanLocale}
          allowClear={true}
          disabled={!ability.can('update', role, 'expiration')}
          defaultValue={role.expiration ? dayjs(new Date(role.expiration)) : undefined}
        />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={putLoading} disabled={!submittable}>
          Update Role
        </Button>
      </Form.Item>
    </Form>
  );
};

export default RoleGeneralData;
