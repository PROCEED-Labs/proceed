'use client';

import { toCaslResource } from '@/lib/ability/caslAbility';
import { ApiData } from '@/lib/fetch-data';
import { Alert, App, Button, DatePicker, Form, Input } from 'antd';
import { FC, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import germanLocale from 'antd/es/date-picker/locale/de_DE';
import { useAbilityStore } from '@/lib/abilityStore';
import { updateRole } from '@/lib/data/roles';
import { useRouter } from 'next/navigation';
import { Role } from '@/lib/data/role-schema';

const RoleGeneralData: FC<{ role: Role }> = ({ role: _role }) => {
  const { message } = App.useApp();
  const ability = useAbilityStore((store) => store.ability);
  const [form] = Form.useForm();
  const router = useRouter();

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

  const role = toCaslResource('Role', _role);

  async function submitChanges(values: Record<string, any>) {
    if (typeof values.expirationDayJs === 'object') {
      values.expiration = (values.expirationDayJs as dayjs.Dayjs).toISOString();
      delete values.expirationDayJs;
    }

    try {
      const result = await updateRole(role.id, values);
      if (result && 'error' in result) throw new Error();
      router.refresh();
      message.open({ type: 'success', content: 'Role updated' });
    } catch (_) {
      message.open({ type: 'error', content: 'Something went wrong' });
    }
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
        <Button type="primary" htmlType="submit" disabled={!submittable}>
          Update Role
        </Button>
      </Form.Item>
    </Form>
  );
};

export default RoleGeneralData;
