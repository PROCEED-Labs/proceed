import React, { FC, useCallback, useEffect, useState } from 'react';
import type { ElementLike } from 'diagram-js/lib/core/Types';
import {
  Descriptions,
  Divider,
  Space,
  Tooltip,
  TreeSelect,
  Typography,
  DescriptionsProps,
  Button,
  Cascader,
} from 'antd';
import { UserOutlined, TeamOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { useAbilityStore } from '@/lib/abilityStore';
import { useEnvironment } from '@/components/auth-can';
import { getMembers, getRoles, getUserById, getUsers } from '@/lib/data/DTOs';
// import { getRoles as getRolesDB } from '@/lib/data/db/iam/roles';
import Ability from '@/lib/ability/abilityHelper';
import { BPMNCanvasRef } from '@/components/bpmn-canvas';
import { Role } from '@/lib/data/role-schema';
import { User } from '@/lib/data/user-schema';
import type { CascaderProps, GetProp } from 'antd';

const { Text } = Typography;

type UserMappingProps = {
  selectedElement: ElementLike;
  modeler: BPMNCanvasRef | null;
};

type TreeData = {
  title: string | JSX.Element;
  value: string;
  key?: string;
}[];

type Option = {
  value: string;
  label: string | React.ReactNode;
  children?: Option[];
};

type DefaultOptionType = GetProp<CascaderProps, 'options'>[number];

const UserMapping: FC<UserMappingProps> = ({ selectedElement, modeler }) => {
  const ability = useAbilityStore((store) => store.ability);
  const environment = useEnvironment();

  const options: Option[] = [
    {
      label: (
        <>
          <UserOutlined />
          User
        </>
      ),
      value: 'all-users',
      children: [{ label: 'Maxi', value: 'maxi' }],
    },
    {
      label: (
        <>
          <TeamOutlined />
          Roles
        </>
      ),
      value: 'all-roles',
      children: [{ label: 'Admin', value: 'admin' }],
    },
  ];

  const filter = (inputValue: string, path: DefaultOptionType[]) =>
    path.some((option) => option.value.toLowerCase().indexOf(inputValue.toLowerCase()) > -1);

  const [executinRoles, setExecutinRoles] = useState<TreeData>([]);
  const [executingUsers, setExecutingUsers] = useState<TreeData>([]);

  const [responsibleRoles, setResponsibleRoles] = useState<TreeData>([]);
  const [responsibleUsers, setResponsibleUsers] = useState<TreeData>([]);

  useEffect(() => {
    if (!environment) return;

    const spaceID = environment.spaceId;

    getRolesAndUsers(spaceID);

    getRolesUserColumns(spaceID, ability).then(({ roles, users }) => {
      setExecutinRoles(roles);
      setExecutingUsers(users);

      setResponsibleRoles(roles);
      setResponsibleUsers(users);
    });
  }, [getRolesUserColumns, ability, environment]);

  return (
    <>
      <Space
        direction="vertical"
        style={{ width: '100%' }}
        role="group"
        aria-labelledby="user-task-mapping-title"
      >
        <Divider style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem' }}>
          <span style={{ marginRight: '0.3em', marginBottom: '0.1rem' }}>Possible Performer</span>
          <Tooltip title={<div>Who executes this task?</div>}>
            <Button type="text" icon={<QuestionCircleOutlined />} />
          </Tooltip>
        </Divider>
        {/* <Space direction="vertical" style={{ width: '100%' }}> */}
        {/* User and Role selection */}
        <Cascader
          options={options}
          placeholder="Select User or Roles that can claim this task"
          style={{ width: '100%' }}
          multiple
          showSearch={{ filter }}
        />
        {/* </Space> */}
      </Space>
      {/* <Space
        direction="vertical"
        style={{ width: '100%' }}
        role="group"
        aria-labelledby="user-task-mapping-title"
      >
        <Tooltip title={<div>Who is responsible for this task?</div>}>
          <Divider style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem' }}>
            <span style={{ marginRight: '0.3em' }}>Responsible</span>
          </Divider>
          <Space direction="vertical" style={{ width: '100%' }}>
            <ResourceTree recources={executinRoles} placeholder="Roles Responsible for the Task" />

            <ResourceTree recources={executingUsers} placeholder="Users Rsponsible for the Task" />
          </Space>
        </Tooltip>
      </Space> */}
    </>
  );
};

async function getRolesAndUsers(spaceID: string) {
  const roles = await getRoles(spaceID);
  const users = await getUsers();

  console.log('Roles:', roles);
  console.log('Users:', users);
}

async function getRolesUserColumns(
  spaceID: string,
  ability: Ability,
  filterFunctions: {
    role: (role: Role, ind?: Number, arr?: Role[]) => boolean;
    user: (user: User, ind?: Number, arr?: User[]) => boolean;
  } = {
    role: () => true,
    user: () => true,
  },
) {
  const { role: roleFilter, user: userFilter } = filterFunctions;

  /* Get roles of Space */
  const rawRoles = (await getRoles(spaceID /* , ability */)).filter(roleFilter);
  /* Get members of orga / space */
  const memberIDs = (await getMembers(spaceID /* , ability */)).map(({ userId }) => userId);
  /* Map Members to users */
  const rawUsers = (
    await Promise.all(memberIDs.map(async (userID) => (await getUserById(userID)) as User))
  ).filter(userFilter);

  /* Map to column shape */
  const roles = rawRoles.map(({ id, name }) => ({
    title: (
      // @ts-ignore
      <>
        <span style={{ marginRight: '4px' }}>
          <TeamOutlined />
          {/* <UserOutlined /> */}
        </span>
        {name}
      </>
    ),
    value: id,
    // icon: <TeamOutlined />, /* Currently bugged */
  })) as TreeData;

  const users = (
    rawUsers.map(
      // @ts-ignore
      ({ id, firstName, lastName, username }) => ({
        title: (
          <>
            <span style={{ marginRight: '4px' }}>
              {/* <TeamOutlined /> */}
              <UserOutlined />
            </span>
            {firstName && lastName ? `${firstName} ${lastName}` : username ? username : 'Guest'}
          </>
        ),
        value: id,
        // icon: <UserOutlined />, /* Currently bugged */
      }),
    ) as TreeData
  ).filter(({ title }) => title !== 'Guest');

  return { roles, users };
}

type ResourceTreeProps = {
  recources: TreeData;
  placeholder?: string;
};

const ResourceTree: FC<ResourceTreeProps> = ({ recources: treeData, placeholder }) => {
  const { SHOW_PARENT } = TreeSelect;

  const [value, setValue] = useState([] as string[]);

  const selectUser = useCallback((newValues: string[]) => {
    setValue(newValues);
  }, []);

  const treeProps = {
    treeData,
    // treeLine: { showLeafIcon: true }, /* CUrrently bugged */
    value,
    onChange: selectUser,
    treeCheckable: true,
    showCheckedStrategy: SHOW_PARENT,
    placeholder,
    style: {
      width: '100%',
    },
  };

  return <TreeSelect {...treeProps} />;
};

type UserMappingDescritionProps = UserMappingProps & {
  onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
};

export const UserMappingReadOnly: FC<UserMappingDescritionProps> = ({
  selectedElement,
  modeler,
  onClick = () => {},
}) => {
  const user = ['Test', 'Maxi'];
  const roles = ['Admin', 'User'];

  const userMapping: DescriptionsProps['items'] = [
    {
      key: 'execution-description',
      label: 'Performer / Execution:',
      span: 3,
      children: (
        <>
          {roles.map((e, i) => {
            return (
              <>
                <div>
                  <Text
                    keyboard
                    key={`${i}-roles-mapping-description-table`}
                    style={{ color: '#45a852' }}
                  >
                    <span style={{ marginRight: '4px' }}>
                      <TeamOutlined />
                      {/* <UserOutlined /> */}
                    </span>
                    {e}
                  </Text>
                </div>
              </>
            );
          })}
          {user.map((e, i) => {
            return (
              <>
                <div>
                  <Text
                    keyboard
                    key={`${i}-user-mapping-description-table`}
                    style={{ color: '#207ad3' }}
                  >
                    <span style={{ marginRight: '4px' }}>
                      {/* <TeamOutlined /> */}
                      <UserOutlined />
                    </span>
                    {e}
                  </Text>
                </div>
              </>
            );
          })}
        </>
      ),
    },
    {
      key: 'responsibility-description',
      label: 'Responsibility:',
      span: 3,
      children: (
        <>
          {roles.map((e, i) => {
            return (
              <>
                <div>
                  <Text
                    keyboard
                    key={`${i}-roles-mapping-description-table`}
                    style={{ color: '#45a852' }}
                  >
                    <span style={{ marginRight: '4px' }}>
                      <TeamOutlined />
                      {/* <UserOutlined /> */}
                    </span>
                    {e}
                  </Text>
                </div>
              </>
            );
          })}
          {user.map((e, i) => {
            return (
              <>
                <div>
                  <Text
                    keyboard
                    key={`${i}-user-mapping-description-table`}
                    style={{ color: '#207ad3' }}
                  >
                    <span style={{ marginRight: '4px' }}>
                      {/* <TeamOutlined /> */}
                      <UserOutlined />
                    </span>
                    {e}
                  </Text>
                </div>
              </>
            );
          })}
        </>
      ),
    },
  ];

  return (
    <>
      <Space
        direction="vertical"
        style={{ width: '100%' }}
        role="group"
        aria-labelledby="user-task-mapping-title"
      >
        <Divider style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem' }}>
          <span style={{ marginRight: '0.3em' }}>Execution Information</span>
        </Divider>
        <span onClick={onClick}>
          <Descriptions
            // title="Execution Information"
            bordered
            items={userMapping}
            size={'small'}
            layout={'horizontal'}
          />
        </span>
      </Space>
    </>
  );
};

export default UserMapping;
