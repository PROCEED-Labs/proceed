'use client';

import { UserOutlined, WarningOutlined, AppstoreOutlined } from '@ant-design/icons';
import {
  Alert,
  Avatar,
  Button,
  Dropdown,
  MenuProps,
  Modal,
  Select,
  Space,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import { signIn, signOut } from 'next-auth/react';
import { FC, use, useContext, useState } from 'react';
import Assistant from '@/components/assistant';
import UserAvatar from './user-avatar';
import SpaceLink from './space-link';
import { enableChatbot } from 'FeatureFlags';
import { useEnvironment, useSession } from './auth-can';
import Link from 'next/link';
import { spaceURL } from '@/lib/utils';
import { UserSpacesContext } from '@/app/(dashboard)/[environmentId]/layout-client';
import { FaSignOutAlt, FaUserEdit } from 'react-icons/fa';
import { EnvVarsContext } from './env-vars-context';

const HeaderActions: FC = () => {
  const session = useSession();
  const isGuest = session.data?.user.isGuest;
  const loggedIn = session.status === 'authenticated';
  const token = theme.useToken();
  const [guestWarningOpen, setGuestWarningOpen] = useState(false);
  const userSpaces = useContext(UserSpacesContext);
  const activeSpace = useEnvironment();
  const envVars = use(EnvVarsContext);

  if (!loggedIn) {
    return (
      <Space style={{ float: 'right', padding: '16px' }}>
        <Button type="text" onClick={() => signIn()}>
          <u>Sign in</u>
        </Button>

        <Tooltip title="Log in">
          <Avatar icon={<UserOutlined />} onClick={() => signIn()} />
        </Tooltip>
      </Space>
    );
  }

  let actionButton;
  const avatarDropdownItems: MenuProps['items'] = [];

  if (isGuest) {
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

    avatarDropdownItems.push({
      key: 'delete data',
      title: 'Delete Data',
      label: 'Delete Data',
      onClick: () =>
        Modal.confirm({
          title: 'Delete Data',
          content: 'Are you sure you want to delete all your data',
          onOk: signOut,
          maskClosable: true,
        }),
      icon: <FaSignOutAlt />,
    });
  } else if (envVars.PROCEED_PUBLIC_IAM_ACTIVATE) {
    avatarDropdownItems.push({
      key: 'profile',
      title: 'Profile Settings',
      label: <SpaceLink href={`/profile`}>Profile Settings</SpaceLink>,
      icon: <FaUserEdit />,
    });

    // userSpaces is null when the component is outside of the UserSpaces provider
    if (userSpaces) {
      actionButton = (
        <div style={{ padding: '1rem' }}>
          <Select
            options={userSpaces.map((space) => {
              const name = space.isOrganization ? space.name : 'My Space';
              return {
                label: (
                  <Tooltip title={name} placement="left">
                    <Link
                      style={{ display: 'block' }}
                      href={spaceURL(
                        {
                          spaceId: space?.id ?? '',
                          isOrganization: space?.isOrganization ?? false,
                        },
                        `/processes`,
                      )}
                    >
                      <Typography.Text>{name}</Typography.Text>
                    </Link>
                  </Tooltip>
                ),
                value: space.id,
              };
            })}
            defaultValue={activeSpace.spaceId}
            style={{ width: '23ch' }}
          />
        </div>
      );
    }

    avatarDropdownItems.push({
      key: 'spaces',
      title: 'My Spaces',
      label: <SpaceLink href={`/spaces`}>My Spaces</SpaceLink>,
      icon: <AppstoreOutlined />,
    });

    if (envVars.PROCEED_PUBLIC_IAM_ACTIVATE) {
      avatarDropdownItems.push({
        key: 'signout',
        title: 'Sign Out',
        label: 'Sign Out',
        onClick: () => signOut(),
        icon: <FaSignOutAlt />,
      });
    }
  }

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
          message="Beware: If you continue as a guest, the processes you create will not be accessible on other devices and all your data will be automatically deleted after a few days. To save your data you have to sign in"
          type="warning"
          style={{ marginBottom: '1rem' }}
        />
      </Modal>
      <Space style={{ float: 'right', padding: '16px' }}>
        {enableChatbot && <Assistant />}
        {actionButton}
        <div id="PROCEED-profile-menu-button">
          <Dropdown
            menu={{
              items: avatarDropdownItems,
            }}
            trigger={['click']}
          >
            {envVars.PROCEED_PUBLIC_IAM_ACTIVATE ? (
              <span>
                {/* <SpaceLink href={`/profile`}> */}
                <UserAvatar user={session.data.user} style={{ cursor: 'pointer' }} />
                {/* </SpaceLink> */}
              </span>
            ) : null}
          </Dropdown>
        </div>
      </Space>
    </>
  );
};

export default HeaderActions;
