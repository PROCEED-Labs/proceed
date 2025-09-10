'use client';

import { AuthCan, useEnvironment } from '@/components/auth-can';
import { inviteUsersToEnvironment } from '@/lib/data/environment-memberships';
import { wrapServerCall } from '@/lib/wrap-server-call';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Form,
  App,
  Input,
  Modal,
  Grid,
  FloatButton,
  Tag,
  Divider,
  Select,
  Typography,
  Spin,
  InputRef,
  Dropdown,
  MenuProps,
} from 'antd';
import { DefaultOptionType } from 'antd/es/select';
import { useRouter } from 'next/navigation';
import { FC, use, useRef, useState, useTransition } from 'react';
import { EnvVarsContext } from '@/components/env-vars-context';
import useOrganizationRoles from './use-org-roles';
import useDebounce from '@/lib/useDebounce';
import { queryUsers } from '@/lib/data/users';
import { isUserErrorResponse } from '@/lib/user-error';
import UserAvatar from '@/components/user-avatar';
import { z } from 'zod';

const emailSchema = z.string().email();

type UserIdentifierDiscriminator =
  | {
      email: string;
    }
  | {
      username: string;
    };
type QueryInviteUser = {
  id: string;
  profileImage: string | null;
  firstName: string | null;
  lastName: string | null;
} & UserIdentifierDiscriminator;

type EmailUser = {
  email: string;
};

const AddUsersModal: FC<{
  modalOpen: boolean;
  close: () => void;
}> = ({ modalOpen, close }) => {
  const app = App.useApp();
  const router = useRouter();
  const environment = useEnvironment();
  const { spaceId } = useEnvironment();
  const envVars = use(EnvVarsContext);
  const proceedMailServerActive = !!envVars.PROCEED_PUBLIC_MAILSERVER_ACTIVE;

  /* -------------------------------------------------------------------------------------------------
   * Invited Users Management
   * -----------------------------------------------------------------------------------------------*/
  const [users, setUsers] = useState<(QueryInviteUser | EmailUser)[]>([]);
  function addUser(user: QueryInviteUser | EmailUser) {
    let userExists = false;
    if ('email' in user) {
      if (users.some((u) => 'email' in u && u.email === user.email)) userExists = true;
    } else {
      if (users.some((u) => 'username' in u && u.username === user.username)) userExists = true;
    }

    if (!userExists) {
      setUsers((prev) => prev.concat(user));
    }

    setIsMailInvalid(false);
    setSearch('');
    inputRef.current?.input?.focus();
  }

  function addUserByEmail() {
    if (!proceedMailServerActive) return;

    const email = emailSchema.safeParse(search);
    if (!email.success) {
      setIsMailInvalid(true);
      return;
    }
    addUser({ email: email.data });
  }

  /* -------------------------------------------------------------------------------------------------
   * User Search
   * -----------------------------------------------------------------------------------------------*/
  const inputRef = useRef<InputRef>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 500, true);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [isMailInvalid, setIsMailInvalid] = useState(false);

  const { data, isLoading: usersSearchLoading } = useQuery({
    queryFn: async () => {
      if (debouncedSearch.length < 4) {
        return [];
      } else {
        const response = await queryUsers(spaceId, debouncedSearch);
        if (isUserErrorResponse(response)) {
          throw response.error;
        }

        for (const user of response) {
          if (proceedMailServerActive && user.email?.includes(debouncedSearch)) {
            delete (user as any).username;
          } else {
            delete (user as any).email;
          }
        }

        return response as QueryInviteUser[];
      }
    },
    queryKey: ['user-search', debouncedSearch],
  });

  let autocompleteOptions: NonNullable<MenuProps>['items'] = [];
  if (usersSearchLoading) {
    autocompleteOptions = [
      {
        key: 'loading',
        label: <Spin spinning />,
        disabled: true,
      },
    ];
  } else if (!data || data.length === 0) {
    autocompleteOptions = [
      {
        key: 'not-found',
        type: 'item',
        label: 'No users found',
        disabled: true,
      },
    ];
  } else {
    autocompleteOptions = data.map((user) => ({
      key: user.id,
      label: (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '.5rem',
          }}
        >
          <UserAvatar user={user} style={{ flexShrink: 0 }} />
          <span style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}>
            {'email' in user ? user.email : user.username}
          </span>
        </div>
      ),
      onClick: (_) => addUser(user),
    }));
  }

  /* -------------------------------------------------------------------------------------------------
   * Roles Management
   * -----------------------------------------------------------------------------------------------*/
  const { roles } = useOrganizationRoles(environment.spaceId);
  const [selectedRoles, setSelectedRoles] = useState<DefaultOptionType[]>([]);

  /* -------------------------------------------------------------------------------------------------
   * Submit Data
   * -----------------------------------------------------------------------------------------------*/
  function closeModal() {
    close();
    setIsMailInvalid(false);
    setSearch('');
    setUsers([]);
  }

  const [submittingUsers, startTransition] = useTransition();
  const submitData = () => {
    startTransition(async () => {
      try {
        const roleIds = selectedRoles.map((role) => role.value as string);

        await wrapServerCall({
          fn: () => inviteUsersToEnvironment(environment.spaceId, users, roleIds),
          onSuccess: () => {
            app.message.success({ content: `User${users.length > 1 ? 's' : ''} invited` });
            router.refresh();
            closeModal();
          },
          app,
        });
        close();
      } catch (_) {}
    });
  };

  return (
    <Modal
      open={modalOpen}
      onCancel={closeModal}
      title="Invite New Users"
      closeIcon={null}
      okText="Invite Users"
      onOk={submitData}
      okButtonProps={{ loading: submittingUsers, disabled: users.length === 0 }}
    >
      <div style={{ display: 'flex', gap: '.5rem' }}>
        <Dropdown
          menu={{ items: autocompleteOptions }}
          open={searchDropdownOpen}
          onOpenChange={(open) => setSearchDropdownOpen(open)}
        >
          <Form.Item
            validateStatus={isMailInvalid ? 'error' : undefined}
            help={isMailInvalid ? 'Invalid E-Mail' : undefined}
            style={{ flexGrow: 1 }}
          >
            <Input
              ref={inputRef}
              placeholder={
                proceedMailServerActive ? 'Enter E-Mail or Username' : 'Enter a Username'
              }
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onPressEnter={addUserByEmail}
              onFocus={() => setSearchDropdownOpen(true)}
              onBlur={(event) => {
                event.target;
              }}
              autoComplete="off"
            />
          </Form.Item>
        </Dropdown>
        <Button type="primary" htmlType="submit">
          <PlusOutlined />
        </Button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem' }}>
        {users.map((user, idx) => (
          <Tag
            key={idx}
            onClose={() => setUsers((prev) => prev.filter((_, userIdx) => userIdx !== idx))}
            closeIcon
            style={{
              borderRadius: '20px',
              padding: '.2rem .7rem',
            }}
          >
            {'email' in user ? user.email : user.username}
          </Tag>
        ))}
      </div>

      {roles && roles.length > 0 && users.length > 0 && (
        <>
          <Divider />

          <Typography.Title style={{ marginBottom: 0 }}>Roles</Typography.Title>
          <Typography.Text style={{ display: 'block', marginBottom: '0.5rem' }}>
            You can select roles for the users you're inviting
          </Typography.Text>

          <Select
            mode="multiple"
            allowClear
            style={{ width: '100%' }}
            placeholder="Select roles"
            onChange={(_, values) => setSelectedRoles(values as DefaultOptionType[])}
            options={roles.map((role) => ({ label: role.name, value: role.id }))}
          />
        </>
      )}
    </Modal>
  );
};

const InviteUserButton: FC = () => {
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);
  const breakpoint = Grid.useBreakpoint();

  return (
    <>
      <AddUsersModal modalOpen={createUserModalOpen} close={() => setCreateUserModalOpen(false)} />

      <AuthCan create User>
        {/* TODO: fix icon for float button in button group */}
        <Button
          type="primary"
          onClick={() => setCreateUserModalOpen(true)}
          style={{ marginRight: '10px' }}
        >
          {breakpoint.xl ? 'Invite User' : 'Invite'}
        </Button>
      </AuthCan>
    </>
  );
};

export const FloatButtonActions: FC = () => {
  const [createUserModalOpen, setCreateUserModalOpen] = useState(false);

  return (
    <>
      <AddUsersModal modalOpen={createUserModalOpen} close={() => setCreateUserModalOpen(false)} />

      <AuthCan create User>
        <FloatButton
          type="primary"
          style={{ marginBottom: '60px', zIndex: '101' }}
          icon={<PlusOutlined />}
          onClick={() => setCreateUserModalOpen(true)}
        />
      </AuthCan>
    </>
  );
};

export default InviteUserButton;
