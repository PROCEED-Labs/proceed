import React, { FC } from 'react';
import type { ElementLike } from 'diagram-js/lib/core/Types';
import { Divider, Space, Tooltip, Button, Cascader } from 'antd';
import { UserOutlined, TeamOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { BPMNCanvasRef } from '@/components/bpmn-canvas';
import type { CascaderProps, GetProp } from 'antd';
import usePotentialOwnerStore, { RoleType, UserType } from './use-potentialOwner-store';

type PotentialOwnerProps = {
  selectedElement: ElementLike;
  modeler: BPMNCanvasRef | null;
};

export type Option = {
  value: string;
  label: string | React.ReactNode;
  children?: Option[];
};

export type DefaultOptionType = GetProp<CascaderProps, 'options'>[number];

export function generateOptions(user: UserType, roles: RoleType): Option[] {
  return [
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
}

export function getSelectedUserAndRoles(
  selectedElement: ElementLike,
  resourcetype: 'bpmn:PotentialOwner' | 'bpmn:Performer',
) {
  const user: string[][] = [],
    roles: string[][] = [];
  selectedElement?.businessObject?.resources?.forEach((resource: any) => {
    if (
      resource.$type === resourcetype &&
      resource.resourceAssignmentExpression?.expression?.body
    ) {
      const { user: _user, roles: _roles } = JSON.parse(
        resource.resourceAssignmentExpression.expression.body,
      ) as {
        user: string[];
        roles: string[];
      };
      _user.forEach((id) => user.push(['all-user', `user|${id}`]));
      _roles.forEach((id) => roles.push(['all-roles', `roles|${id}`]));
    }
  });
  return { user, roles };
}

const PotentialOwner: FC<PotentialOwnerProps> = ({ selectedElement, modeler }) => {
  const { user, roles } = usePotentialOwnerStore();

  const { user: selectedUser, roles: selectedRoles } = getSelectedUserAndRoles(
    selectedElement,
    'bpmn:PotentialOwner',
  );

  const options: Option[] = generateOptions(user, roles);

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
      modeling.updateModdleProperties(selectedElement as any, selectedElement.businessObject, {
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
        aria-labelledby="user-task-performer-selection"
      >
        {selectedElement.type === 'bpmn:UserTask' && (
          <>
            <Divider style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem' }}>
              <span style={{ marginRight: '0.3em', marginBottom: '0.1rem' }}>
                Possible Performer
              </span>
              <Tooltip
                title={
                  <div>
                    Select User and Roles who will see this User-Task in their Tasklist. They can
                    claim and work on it.
                  </div>
                }
              >
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
