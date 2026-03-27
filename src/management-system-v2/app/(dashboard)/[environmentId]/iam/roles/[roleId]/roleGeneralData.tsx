'use client';

import { toCaslResource } from '@/lib/ability/caslAbility';
import { Alert, App, Button, Flex, Form, Input, Select, Tooltip } from 'antd';
import { FC } from 'react';
import { useAbilityStore } from '@/lib/abilityStore';
import { updateRole } from '@/lib/data/roles';
import { useRouter } from 'next/navigation';
import { Role, RoleInputSchema } from '@/lib/data/role-schema';
import { useEnvironment } from '@/components/auth-can';
import useParseZodErrors, { antDesignInputProps } from '@/lib/useParseZodErrors';
import FormSubmitButton from '@/components/form-submit-button';
import { Folder } from '@/lib/data/folder-schema';
import { wrapServerCall } from '@/lib/wrap-server-call';
import { QuestionCircleOutlined } from '@ant-design/icons';

const InputSchema = RoleInputSchema.omit({ environmentId: true, permissions: true });

const RoleGeneralData: FC<{ role: Role; roleParentFolder?: Folder }> = ({ role: _role }) => {
  const app = App.useApp();
  const ability = useAbilityStore((store) => store.ability);
  const [form] = Form.useForm();
  const router = useRouter();
  const environment = useEnvironment();

  const [errors, parseInput] = useParseZodErrors(InputSchema);

  const role = toCaslResource('Role', _role);

  async function submitChanges(values: Record<string, any>) {
    // if (typeof values?.expirationDayJs === 'object') {
    //   values.expiration = (values.expirationDayJs as dayjs.Dayjs).toISOString();
    //   delete values.expirationDayJs;
    // }

    await wrapServerCall({
      fn: () => updateRole(environment.spaceId, role.id, values),
      onSuccess: () => {
        router.refresh();
        app.message.open({ type: 'success', content: 'Role updated' });
      },
      app,
    });
  }

  let note;
  if (role.note) {
    note = role.note;
  } else if (role.name === '@guest') {
    note = 'This role applies to users that are not part of the organization.';
  } else if (role.name === '@everyone') {
    note = 'This role applies to every user that is part of the organization.';
  }

  return (
    <Form form={form} layout="vertical" onFinish={submitChanges} initialValues={role}>
      {note && (
        <>
          <Alert type="info" title={note} />
          <br />
        </>
      )}

      <Form.Item label="Name" name="name" {...antDesignInputProps(errors, 'name')} required>
        <Input disabled={!ability.can('update', role, { field: 'name' })} />
      </Form.Item>

      <Form.Item
        label="Description"
        name="description"
        {...antDesignInputProps(errors, 'description')}
      >
        <Input.TextArea disabled={!ability.can('update', role, { field: 'description' })} />
      </Form.Item>

      <Form.Item
        label={
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            Organisation Role Type
            <Tooltip
              title={
                <>
                  Link this role to specific departments or teams. This ensures people can find the
                  right role when updating user profiles or assigning tasks.
                </>
              }
            >
              {' '}
              <QuestionCircleOutlined style={{ color: '#888', cursor: 'pointer' }} />
            </Tooltip>
          </span>
        }
        name="organizationRoleType"
      >
        <Select
          mode="multiple"
          allowClear
          disabled={!ability.can('update', role, { field: 'organizationRoleType' })}
          placeholder="Select organisation role type (optional)"
          options={[
            { label: 'Team', value: 'team' },
            { label: 'Back Office', value: 'back-office' },
          ]}
        />
      </Form.Item>

      <Flex justify="end" gap={5}>
        <Button onClick={() => form.resetFields()}>Cancel</Button>
        <Form.Item>
          <FormSubmitButton submitText="Save" isValidData={(values) => !!parseInput(values)} />
        </Form.Item>
      </Flex>
    </Form>
  );
};

export default RoleGeneralData;
