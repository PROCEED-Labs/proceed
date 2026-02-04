'use client';

import { useEnvironment } from '@/components/auth-can';
import ConfirmationButton from '@/components/confirmation-button';
import { deleteOrganizationEnvironments } from '@/lib/data/environments';
import { App } from 'antd';
import { useRouter } from 'next/navigation';

const DeleteOrganizationButton = () => {
  const { message } = App.useApp();
  const router = useRouter();

  const space = useEnvironment();

  async function deleteOrganization() {
    try {
      const result = await deleteOrganizationEnvironments([space.spaceId]);

      if (result?.error) throw result.error.message;

      message.open({
        content: 'Organization deleted',
        type: 'success',
      });
      router.push('/processes');
    } catch (e) {
      let content = typeof e === 'string' ? e : 'Something went wrong';

      message.open({ content, type: 'error' });
    }
  }

  return (
    <ConfirmationButton
      title="Delete Organization"
      description="The organization and all processes inside it will be deleted."
      onConfirm={deleteOrganization}
      buttonProps={{
        danger: true,
        type: 'primary',
      }}
      modalProps={{
        okText: 'Delete',
        okButtonProps: {
          danger: true,
        },
      }}
    >
      Delete Organization
    </ConfirmationButton>
  );
};

export default DeleteOrganizationButton;
