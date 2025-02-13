import React, { FC, use, useCallback, useEffect, useState } from 'react';
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
import usePotentialOwnerStore from './use-potentialOwner-store';

const { Text } = Typography;

type PotentialOwnerProps = {
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

const PotentialOwner: FC<PotentialOwnerProps> = ({ selectedElement, modeler }) => {
  const { user, roles } = usePotentialOwnerStore();

  const selectedUser: string[][] = [];
  const selectedRoles: string[][] = [];
  selectedElement?.businessObject?.resources?.forEach((resource: any) => {
    if (
      resource.$type === 'bpmn:PotentialOwner' &&
      resource.resourceAssignmentExpression?.expression?.body
    ) {
      const { user, roles } = JSON.parse(resource.resourceAssignmentExpression.expression.body) as {
        user: string[];
        roles: string[];
      };
      user.forEach((id) => selectedUser.push(['all-user', `user|${id}`]));
      roles.forEach((id) => selectedRoles.push(['all-roles', `roles|${id}`]));
    }
  });

  const options: Option[] = [
    {
      label: (
        <>
          <UserOutlined />
          User
        </>
      ),
      value: 'all-user',
      children: Object.entries(user).map(([id, { name, userName }]) => ({
        value: `user|${id}`,
        label: userName || name,
        key: id,
      })),
    },
    {
      label: (
        <>
          <TeamOutlined />
          Roles
        </>
      ),
      value: 'all-roles',
      children: Object.entries(roles).map(([id, name]) => ({
        key: id,
        value: `roles|${id}`,
        label: name,
      })),
    },
  ];

  const filter = (inputValue: string, path: DefaultOptionType[]) =>
    path.some((option) => option.value.toLowerCase().indexOf(inputValue.toLowerCase()) > -1);

  function setPotentialOwner(value: string[][]) {
    const potentialOwnerIds = value
      .map((v) => v[v.length - 1])
      .reduce(
        (acc, value) => {
          if (value === 'all-user') {
            acc.user = Object.keys(user);
          } else if (value === 'all-roles') {
            acc.roles = Object.keys(roles);
          } else {
            const [type, id] = value.split('|') as ['user' | 'roles', string];
            acc[type].push(id);
          }
          return acc;
        },
        { user: [], roles: [] } as { user: string[]; roles: string[] },
      );

    if (modeler) {
      const modeling = modeler.getModeling();
      const factory = modeler.getFactory();

      let potentialOwners: any[] = [];

      if (potentialOwnerIds.roles.length || potentialOwnerIds.user.length) {
        const expression = factory.create('bpmn:Expression', {
          body: JSON.stringify(potentialOwnerIds),
        });
        const resourceAssignmentExpression = factory.create('bpmn:ResourceAssignmentExpression', {
          expression,
        });
        const potentialOwner = factory.create('bpmn:PotentialOwner', {
          resourceAssignmentExpression,
        });
        potentialOwners = [potentialOwner];
      }
      // @ts-ignore
      modeling.updateModdleProperties(selectedElement, selectedElement.businessObject, {
        resources: potentialOwners,
      });
    }
  }

  return (
    <>
      <Space
        direction="vertical"
        style={{ width: '100%' }}
        role="group"
        aria-labelledby="user-task-mapping-title"
      >
        {selectedElement.type === 'bpmn:UserTask' && (
          <>
            <Divider style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem' }}>
              <span style={{ marginRight: '0.3em', marginBottom: '0.1rem' }}>
                Possible Performer
              </span>
              <Tooltip title={<div>Who executes this task?</div>}>
                <Button type="text" icon={<QuestionCircleOutlined />} />
              </Tooltip>
            </Divider>
            {/* User and Role selection */}
            <Cascader
              options={options}
              placeholder="Select User or Roles that can claim this task"
              style={{ width: '100%' }}
              multiple
              showSearch={{ filter }}
              // @ts-ignore
              onChange={setPotentialOwner}
              defaultValue={[...selectedUser, ...selectedRoles]}
            />
          </>
        )}
      </Space>
    </>
  );
};

export default PotentialOwner;
