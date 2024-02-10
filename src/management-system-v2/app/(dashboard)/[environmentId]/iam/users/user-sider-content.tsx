'use client';

import { FC } from 'react';
import { Avatar, Typography } from 'antd';
import { ListUser } from '@/components/user-list';

const UserSiderContent: FC<{ user: ListUser | null }> = ({ user }) => {
  return (
    <>
      {user ? (
        <>
          <Avatar src={user.image} size={60} style={{ marginBottom: 20 }}>
            {user.image ? null : user.firstName.value.slice(0, 1) + user.lastName.value.slice(0, 1)}
          </Avatar>

          <Typography.Title>First Name</Typography.Title>
          <Typography.Text>{user.firstName.value}</Typography.Text>

          <Typography.Title>Last Name</Typography.Title>
          <Typography.Text>{user.lastName.value}</Typography.Text>

          <Typography.Title>Username</Typography.Title>
          <Typography.Text>{user.username.value}</Typography.Text>

          <Typography.Title>Email</Typography.Title>
          <Typography.Text>{user.email.value}</Typography.Text>
        </>
      ) : (
        <Typography.Text>Select an element.</Typography.Text>
      )}
    </>
  );
};

export default UserSiderContent;
