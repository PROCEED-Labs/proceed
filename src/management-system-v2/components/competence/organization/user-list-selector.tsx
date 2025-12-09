'use client';

import { useState } from 'react';
import { Input, List, Avatar, Typography, Space } from 'antd';
import { SearchOutlined, UserOutlined } from '@ant-design/icons';
import { User } from '@/lib/data/user-schema';
import styles from './user-list-selector.module.scss';

const { Text } = Typography;

function getUserDisplayName(user: User): string {
  if (user.isGuest) return 'Guest User';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || user.id;
}

function getUserInitials(user: User): string {
  if (user.isGuest) return 'G';
  if (user.firstName && user.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  }
  if (user.username) return user.username.substring(0, 2).toUpperCase();
  return 'U';
}

type UserListSelectorProps = {
  users: User[];
  selectedUser: User | null;
  onSelectUser: (user: User) => void;
};

const UserListSelector: React.FC<UserListSelectorProps> = ({
  users,
  selectedUser,
  onSelectUser,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Client-side filter for user search
  const filteredUsers = searchQuery.trim()
    ? users.filter((user) => {
        const searchLower = searchQuery.toLowerCase();
        const displayName = getUserDisplayName(user).toLowerCase();
        const email = !user.isGuest && user.email ? user.email.toLowerCase() : '';
        return displayName.includes(searchLower) || email.includes(searchLower);
      })
    : users;

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Input
        placeholder="Search users..."
        prefix={<SearchOutlined />}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        allowClear
      />
      <List
        dataSource={filteredUsers}
        renderItem={(user) => (
          <List.Item
            onClick={() => onSelectUser(user)}
            className={`${styles.UserListItem} ${selectedUser?.id === user.id ? styles.Selected : ''}`}
            style={{ cursor: 'pointer', padding: '12px 8px' }}
          >
            <List.Item.Meta
              avatar={
                user.isGuest ? (
                  <Avatar icon={<UserOutlined />} />
                ) : user.profileImage ? (
                  <Avatar src={user.profileImage} />
                ) : (
                  <Avatar style={{ backgroundColor: '#1890ff' }}>{getUserInitials(user)}</Avatar>
                )
              }
              title={<Text strong>{getUserDisplayName(user)}</Text>}
              description={
                !user.isGuest && user.email ? (
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {user.email}
                  </Text>
                ) : null
              }
            />
          </List.Item>
        )}
      />
    </Space>
  );
};

export default UserListSelector;
