'use client';

import { UserOutlined } from '@ant-design/icons';
import { Avatar, Button, Dropdown, MenuProps, Select, Space, Tooltip, Typography } from 'antd';
import { signIn, signOut, useSession } from 'next-auth/react';
import { FC, useContext } from 'react';
import Assistant from '@/components/assistant';
import UserAvatar from './user-avatar';
import SpaceLink from './space-link';
import { enableChatbot } from 'FeatureFlags';
import { useEnvironment } from './auth-can';
import Link from 'next/link';
import { spaceURL } from '@/lib/utils';
import { UserSpacesContext } from '@/app/(dashboard)/[environmentId]/layout-client';

const HeaderActions: FC = () => {
  const session = useSession();
  const isGuest = session.data?.user.guest;
  const loggedIn = session.status === 'authenticated';
  const userSpaces = useContext(UserSpacesContext);
  const activeSpace = useEnvironment();

  if (!process.env.NEXT_PUBLIC_USE_AUTH) {
    return null;
  }

  if (!loggedIn) {
    return (
      <Space style={{ float: 'right', padding: '16px' }}>
        <Button type="text" onClick={() => signIn()}>
          <u>Log in</u>
        </Button>

        <Tooltip title="Log in">
          <Avatar icon={<UserOutlined />} onClick={() => signIn()} />
        </Tooltip>
      </Space>
    );
  }

  let actionButton;
  const avatarDropdownItems: MenuProps['items'] = [
    {
      key: 'profile',
      title: 'Profile Settings',
      label: <SpaceLink href={`/profile`}>Profile Settings</SpaceLink>,
    },
  ];

  if (isGuest) {
    actionButton = (
      <Button type="text" onClick={() => signIn()}>
        <u>Sign In</u>
      </Button>
    );
  } else {
    // userSpaces is null when the component is outside of the UserSpaces provider
    if (userSpaces) {
      actionButton = (
        <div style={{ padding: '1rem' }}>
          <Select
            options={userSpaces.map((space) => {
              const name = space.organization ? space.name : 'My Space';
              return {
                label: (
                  <Tooltip title={name} placement="left">
                    <Link
                      href={spaceURL(
                        { spaceId: space?.id ?? '', isOrganization: space?.organization ?? false },
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

    avatarDropdownItems.push(
      {
        key: 'environments',
        title: 'My Spaces',
        label: <SpaceLink href={`/environments`}>My Spaces</SpaceLink>,
      },
      {
        key: 'signout',
        title: 'Sign out',
        label: 'Sign out',
        onClick: () => signOut(),
      },
    );
  }

  return (
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
  );
};

export default HeaderActions;
