'use client';

import { UserOutlined, WarningOutlined } from '@ant-design/icons';
import {
  Alert,
  Avatar,
  Button,
  ConfigProvider,
  Dropdown,
  Modal,
  Space,
  Tooltip,
  theme,
} from 'antd';
import { signIn, signOut, useSession } from 'next-auth/react';
import { FC, ReactNode, useState } from 'react';
import Assistant from '@/components/assistant';
import UserAvatar from './user-avatar';
import SpaceLink from './space-link';
import { enableChatbot } from 'FeatureFlags';

const HeaderActions: FC = () => {
  const session = useSession();
  const isGuest = session.data?.user.guest;
  const loggedIn = session.status === 'authenticated';
  const token = theme.useToken();
  const [guestWarningOpen, setGuestWarningOpen] = useState(false);

  if (!process.env.NEXT_PUBLIC_USE_AUTH) {
    return null;
  }

  if (!loggedIn) {
    return (
      <Space style={{ float: 'right' }}>
        <Button type="text" onClick={() => signIn()}>
          <u>Sign in</u>
        </Button>

        <Tooltip title="Sign in">
          <Button shape="circle" icon={<UserOutlined />} onClick={() => signIn()} />
        </Tooltip>
      </Space>
    );
  }

  const avatarDropdownItems = [
    {
      key: 'profile',
      title: 'Account Settings',
      label: <SpaceLink href={`/profile`}>Account Settings</SpaceLink>,
    },
  ];
  if (!isGuest)
    avatarDropdownItems.push({
      key: 'environments',
      title: 'My environments',
      label: <SpaceLink href={`/environments`}>My Spaces</SpaceLink>,
    });

  let actionButton;
  if (!isGuest) {
    actionButton = (
      <Button type="text" onClick={() => signOut({ redirect: true, callbackUrl: '/' })}>
        <u>Logout</u>
      </Button>
    );
  } else
    actionButton = (
      <>
        <Button
          style={{
            color: token.token.colorWarning,
          }}
          icon={<WarningOutlined />}
          type="text"
          onClick={() => setGuestWarningOpen(true)}
        />
        <Button type="text" onClick={() => signIn()}>
          <u>Sign In</u>
        </Button>
      </>
    );

  return (
    <>
      <Modal
        open={guestWarningOpen}
        title="You're signed in as a guest"
        closeIcon={null}
        onCancel={() => setGuestWarningOpen(false)}
        okButtonProps={{
          children: 'Continue as guest',
        }}
        okText="Sign in"
        onOk={() => signIn()}
      >
        <Alert
          message="Beware: If you continue as a guest, the processes your create will not be accessible on other devicces and all your data will be automatically deleted after a few days. To save your data you have to sign in"
          type="warning"
          style={{ marginBottom: '1rem' }}
        />
      </Modal>
      <Space style={{ float: 'right', padding: '16px' }}>
        {enableChatbot && <Assistant />}
        {actionButton}
        <Dropdown
          menu={{
            items: avatarDropdownItems,
          }}
        >
          <SpaceLink href={`/profile`}>
            <UserAvatar user={session.data.user} />
          </SpaceLink>
        </Dropdown>
      </Space>
    </>
  );
};

export default HeaderActions;
