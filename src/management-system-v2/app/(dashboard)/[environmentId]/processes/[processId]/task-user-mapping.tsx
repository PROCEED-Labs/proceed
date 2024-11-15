import React, { FC, useCallback, useEffect, useState } from 'react';
import type { ElementLike } from 'diagram-js/lib/core/Types';
import { Divider, Space, TreeSelect } from 'antd';
import { useAbilityStore } from '@/lib/abilityStore';
import { useEnvironment } from '@/components/auth-can';
import { getRoles, getUserById } from '@/lib/data/DTOs';
import Ability from '@/lib/ability/abilityHelper';
import { set } from 'zod';
import { BPMNCanvasRef } from '@/components/bpmn-canvas';
import { tree } from 'next/dist/build/templates/app-page';

type UserMappingProps = {
  selectedElement: ElementLike;
  modeler: BPMNCanvasRef | null;
};

type TreeData = {
  title: string;
  value: string;
  key: string;
  children: {
    title: string;
    value: string;
    key: string;
  }[];
}[];

const UserMapping: FC<UserMappingProps> = ({ selectedElement, modeler }) => {
  const ability = useAbilityStore((store) => store.ability);
  const environment = useEnvironment();

  const [executes, setExecutes] = useState<TreeData>([]);
  const [blames, setBlames] = useState<TreeData>([]);

  useEffect(() => {
    if (!environment) return;

    const spaceID = environment.spaceId;

    getRolesUserColumns(spaceID, ability).then((columns) => {
      setExecutes(columns);
      setBlames(columns);
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
          <span style={{ marginRight: '0.3em' }}>Execution</span>
        </Divider>
        <UserTree userSelection={executes} placeholder="Who executes this task?" />
      </Space>
      <Space
        direction="vertical"
        style={{ width: '100%' }}
        role="group"
        aria-labelledby="user-task-mapping-title"
      >
        <Divider style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem' }}>
          <span style={{ marginRight: '0.3em' }}>Blame:</span>
        </Divider>
        <UserTree userSelection={blames} placeholder="Who is responsible for this task?" />
      </Space>
    </>
  );
};

async function getRolesUserColumns(
  spaceID: string,
  ability: Ability,
  filterFunction: (role: Role, ind?: Number, arr?: Role[]) => boolean = () => true,
) {
  /* Get roles of Space */
  const roles = await getRoles(spaceID /* , ability */);
  /* Get members for each role */
  const result = await Promise.all(
    roles.map(async (role) => {
      return {
        title: role.name,
        value: '' + '----' + role.id,
        children: await Promise.all(
          role.members.map(async (member) => {
            const user = await getUserById(member.userId);
            /* 
                email: "johndoe@proceed-labs.org"
                emailVerifiedOn: null
                firstName: "John"
                id: "development-id|johndoe"
                image: null
                isGuest: false
                lastName: "Doe"
                username: "johndoe"
            */
            return {
              // @ts-ignore
              title: `${user.lastName}, ${user.firstName}${user.username ? ` (${user.username})` : ''}`,
              value: member.userId + '----' + role.id /* Same user can be in multiple roles */,
              //   key: member.userId + '----' + role.id /* Same user can be in multiple roles */,
            };
          }),
        ),
      };
    }),
  );

  return result.filter(filterFunction);
}

type UserTreeProps = {
  userSelection: TreeData;
  placeholder?: string;
};

const UserTree: FC<UserTreeProps> = ({ userSelection /* : treeData */, placeholder }) => {
  const { SHOW_PARENT } = TreeSelect;

  const treeData = [
    {
      title: 'Group A',
      value: 'Group A',
      key: 'Group A',
      children: [
        {
          title: 'Worker 1',
          value: 'Worker 1----Group A',
        },
      ],
    },
    {
      title: 'Group B',
      value: 'Group B',
      key: 'Group B',
      children: [
        {
          title: 'Worker 2',
          value: 'Worker 2----Group B',
        },
        {
          title: 'Worker 1',
          value: 'Worker 1----Group B',
        },
      ],
    },
    // {
    //   title: 'Group C',
    //   value: 'Group C',
    //   key: 'Group C',
    //   children: [
    //     {
    //       title: 'Worker 1',
    //       value: 'Worker 1----Group C',
    //     },
    //     {
    //       title: 'Worker 3',
    //       value: 'Worker 3----Group C',
    //     },
    //   ],
    // },
    // {
    //   title: 'Group D',
    //   value: 'Group D',
    //   key: 'Group D',
    //   children: [
    //     {
    //       title: 'Worker 1',
    //       value: 'Worker 1----Group D',
    //     },
    //     {
    //       title: 'Worker 2',
    //       value: 'Worker 2----Group D',
    //     },
    //     {
    //       title: 'Worker 3',
    //       value: 'Worker 3----Group D',
    //     },
    //   ],
    // },
  ];

  const roleGroupIDs = treeData.map((roleGroup) => roleGroup.value);
  const userIDs = treeData.flatMap((roleGroup) => roleGroup.children.map((user) => user.value));

  console.log('Role Group IDs:', roleGroupIDs);
  console.log('User IDs:', userIDs);

  const [value, setValue] = useState([] as string[]);

  const selectUser = useCallback((newValues: string[]) => {
    /* newValue : userID----roleID || ----roleID */
    const selectedIDs = newValues.map((newValue) => {
      const [userID, roleID] = newValue.split('----');
      return { userID, roleID };
    });
    /* Selected groups */
    const selectedGroups = selectedIDs
      .filter(({ userID }) => userID === '')
      .map(({ roleID }) => roleID);
    /* Selected users */
    const selectedUsers = selectedIDs
      .filter(({ userID }) => userID !== '')
      .map(({ userID }) => userID);

    console.log('Selected Groups:', selectedGroups);
    console.log('Selected Users:', selectedUsers);

    /* Add groups */
    let newSelection = roleGroupIDs.filter((roleGroupID) => {
      selectedGroups.some((selectedGroup) => {
        roleGroupID.includes(selectedGroup);
      });
    });
    /* Add single selections */
    userIDs.forEach((userID) => {
      if (selectedUsers.some((selectedUser) => userID.includes(selectedUser))) {
        newSelection.push(userID);
      }
    });

    /* Update state */
    setValue(newSelection);
    // setValue((oldSelection) => {
    /* 
        Edge cases: 
        - If a group is selected, all users in that group should be selected in other groups aswell.
        - If a user is deselected, the user should be deselected in all other groups aswell.
        */
    // });
  }, []);

  const treeProps = {
    treeData,
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

export default UserMapping;
