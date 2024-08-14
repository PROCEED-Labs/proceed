'use client';

import { toCaslResource } from '@/lib/ability/caslAbility';
import { Alert, App, DatePicker, Form, Input } from 'antd';
import { FC } from 'react';
import dayjs from 'dayjs';
import germanLocale from 'antd/es/date-picker/locale/de_DE';
import { useAbilityStore } from '@/lib/abilityStore';
import { updateRole } from '@/lib/data/roles';
import { useRouter } from 'next/navigation';
import { Role, RoleInputSchema } from '@/lib/data/role-schema';
import { useEnvironment } from '@/components/auth-can';
import useParseZodErrors, { antDesignInputProps } from '@/lib/useParseZodErrors';
import FormSubmitButton from '@/components/form-submit-button';

const InputSchema = RoleInputSchema.omit({ environmentId: true, permissions: true });

const RoleGeneralData: FC<{ role: Role }> = ({ role: _role }) => {
  const { message } = App.useApp();
  const ability = useAbilityStore((store) => store.ability);
  const [form] = Form.useForm();
  const router = useRouter();
  const environment = useEnvironment();

  const [errors, parseInput] = useParseZodErrors(InputSchema);

  const role = toCaslResource('Role', _role);

  async function submitChanges(values: Record<string, any>) {
    if (typeof values?.expirationDayJs === 'object') {
      values.expiration = (values.expirationDayJs as dayjs.Dayjs).toISOString();
      delete values.expirationDayJs;
    }

    try {
      const result = await updateRole(environment.spaceId, role.id, values);
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

      <Form.Item label="Name" name="name" {...antDesignInputProps(errors, 'name')} required>
        <Input
          placeholder="input placeholder"
          disabled={!ability.can('update', role, { field: 'name' })}
        />
      </Form.Item>

      <Form.Item
        label="Description"
        name="description"
        {...antDesignInputProps(errors, 'description')}
      >
        <Input.TextArea
          placeholder="input placeholder"
          disabled={!ability.can('update', role, { field: 'description' })}
        />
      </Form.Item>

      <Form.Item label="Expiration" name="expirationDayJs">
        <DatePicker
          // Note german locale hard coded
          locale={germanLocale}
          allowClear={true}
          disabled={!ability.can('update', role, { field: 'expiration' })}
          defaultValue={role.expiration ? dayjs(new Date(role.expiration)) : undefined}
        />
      </Form.Item>

      <Form.Item>
        <FormSubmitButton submitText="Update Role" isValidData={(values) => !!parseInput(values)} />
      </Form.Item>
    </Form>
  );
};

export default RoleGeneralData;
