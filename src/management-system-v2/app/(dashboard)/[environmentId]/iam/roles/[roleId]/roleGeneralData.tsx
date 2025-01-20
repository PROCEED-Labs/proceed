'use client';

import { toCaslResource } from '@/lib/ability/caslAbility';
import { Alert, App, Button, DatePicker, Form, Input, Modal, Space } from 'antd';
import { FC, useState } from 'react';
import dayjs from 'dayjs';
import germanLocale from 'antd/es/date-picker/locale/de_DE';
import { useAbilityStore } from '@/lib/abilityStore';
import { updateRole } from '@/lib/data/roles';
import { useRouter } from 'next/navigation';
import { Role, RoleInputSchema } from '@/lib/data/role-schema';
import { useEnvironment } from '@/components/auth-can';
import useParseZodErrors, { antDesignInputProps } from '@/lib/useParseZodErrors';
import FormSubmitButton from '@/components/form-submit-button';
import { FolderTree } from '@/components/FolderTree';
import { ProcessListItemIcon } from '@/components/process-list';
import { Folder } from '@/lib/data/folder-schema';
import { wrapServerCall } from '@/lib/wrap-server-call';

const InputSchema = RoleInputSchema.omit({ environmentId: true, permissions: true });

const FolderInput = ({
  onChange,
  defaultFolder,
}: {
  value?: string;
  onChange?: (id: Role['parentId']) => void;
  defaultFolder?: Folder;
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<{ type: string; name: string } | undefined>(
    () =>
      defaultFolder && {
        type: 'folder',
        name: defaultFolder.parentId ? defaultFolder.name : '< root >',
      },
  );

  return (
    <>
      <Modal
        title="Choose a folder"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        closeIcon={null}
      >
        <Space direction="vertical" style={{ maxWidth: '100%' }}>
          <Button
            onClick={() => {
              onChange?.(undefined);
              setSelectedFolder(undefined);
              setModalOpen(false);
            }}
            type="default"
            danger
          >
            Clear folder
          </Button>
          <FolderTree
            newChildrenHook={(nodes) => nodes.filter((node) => node.element.type === 'folder')}
            treeProps={{
              onSelect(_, info) {
                const element = info.node.element;
                if (element.type !== 'folder') return;

                onChange?.(element.id);
                setSelectedFolder(element);
                setModalOpen(false);
              },
            }}
            showRootAsFolder
          />
        </Space>
      </Modal>
      <Button onClick={() => setModalOpen(true)}>
        {selectedFolder ? (
          <>
            <ProcessListItemIcon item={selectedFolder as any} /> {selectedFolder.name}
          </>
        ) : (
          'Select folder'
        )}
      </Button>
    </>
  );
};

const RoleGeneralData: FC<{ role: Role; roleParentFolder?: Folder }> = ({
  role: _role,
  roleParentFolder,
}) => {
  const app = App.useApp();
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

    await wrapServerCall({
      fn: () => updateRole(environment.spaceId, role.id, values),
      onSuccess: () => {
        router.refresh();
        app.message.open({ type: 'success', content: 'Role updated' });
      },
      app,
    });
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

      <Form.Item label="Folder" name="parentId">
        <FolderInput defaultFolder={roleParentFolder} />
      </Form.Item>

      <Form.Item>
        <FormSubmitButton submitText="Update Role" isValidData={(values) => !!parseInput(values)} />
      </Form.Item>
    </Form>
  );
};

export default RoleGeneralData;
