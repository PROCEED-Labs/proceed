import { use, useState } from 'react';
import { useEnvironment } from './auth-can';
import { App, Button, ButtonProps, Form, Modal } from 'antd';
import PasswordInputFields from './password-input-fields';
import { wrapServerCall } from '@/lib/wrap-server-call';
import { setUserTemporaryPassword } from '@/lib/data/users';
import { useAbilityStore } from '@/lib/abilityStore';
import { EnvVarsContext } from './env-vars-context';

export default function ResetUserPasswordButton({
  user,
  ...buttonProps
}: { user: { id: string; username?: string | null } } & ButtonProps) {
  const app = App.useApp();
  const space = useEnvironment();
  const ability = useAbilityStore((state) => state.ability);
  const env = use(EnvVarsContext);
  // This happens when the component is used outside of the [environmentId] folder (e.g. admin panel)
  const spaceId = space.spaceId !== '' ? space.spaceId : undefined;
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  if (
    // Don't show the button in spaces if PROCEED_PUBLIC_IAM_ONLY_ONE_ORGANIZATIONAL_SPACE=false or
    // if the user is not an admin
    spaceId &&
    (!env.PROCEED_PUBLIC_IAM_ONLY_ONE_ORGANIZATIONAL_SPACE || !ability.can('admin', 'All'))
  )
    return null;

  async function resetUserPassword(tempPassword: string) {
    if (loading) return;
    setLoading(true);

    wrapServerCall({
      fn: () => setUserTemporaryPassword(user.id, tempPassword, spaceId),
      app,
    });

    setModalOpen(false);
    setLoading(false);
  }

  return (
    <>
      <Button {...buttonProps} loading={loading} onClick={() => setModalOpen(true)} />
      <Modal
        title={`Reset ${user.username ?? 'user'}'s password`}
        onOk={form.submit}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        okButtonProps={{ loading }}
        destroyOnHidden
      >
        <Form
          form={form}
          onFinish={(values) => resetUserPassword(values.password)}
          layout="vertical"
          clearOnDestroy
        >
          <PasswordInputFields />
          {/* To submit the form when pressing enter */}
          <button type="submit" hidden />
        </Form>
      </Modal>
    </>
  );
}
