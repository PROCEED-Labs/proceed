import React, { FC, useEffect, useState } from 'react';
import type { ElementLike } from 'diagram-js/lib/core/Types';
import { Divider, Space, Tooltip, Button, Cascader } from 'antd';
import { UserOutlined, TeamOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { BPMNCanvasRef } from '@/components/bpmn-canvas';
import type { CascaderProps, GetProp } from 'antd';
import usePotentialOwnerStore, { RoleType, UserType } from './use-potentialOwner-store';
import useModelerStateStore from './use-modeler-state-store';
import { Shape } from 'bpmn-js/lib/model/Types';
import Modeler from 'bpmn-js/lib/Modeler';
import { is, isAny } from 'bpmn-js/lib/util/ModelUtil';

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

function updateResource(
  type: string,
  element: Shape,
  modeler: BPMNCanvasRef,
  availableResources: { user: UserType; roles: RoleType },
  selected: string[][],
) {
  const resourceIds = selected
    .map((v) => v[v.length - 1])
    .reduce(
      (acc, value) => {
        if (value === 'all-user') {
          acc.user = Object.keys(availableResources.user);
        } else if (value === 'all-roles') {
          acc.roles = Object.keys(availableResources.roles);
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

    const newResources = (element.businessObject?.resources || []).filter((r: any) => !is(r, type));

    if (resourceIds.roles.length || resourceIds.user.length) {
      const expression = factory.create('bpmn:Expression', {
        body: JSON.stringify(resourceIds),
      });
      const resourceAssignmentExpression = factory.create('bpmn:ResourceAssignmentExpression', {
        expression,
      });
      const resource = factory.create(type, {
        resourceAssignmentExpression,
      });
      newResources.push(resource);
    }

    modeling.updateModdleProperties(element, element.businessObject, {
      resources: newResources,
    });
  }
}

const filter = (inputValue: string, path: DefaultOptionType[]) =>
  path.some((option) => option.value.toLowerCase().indexOf(inputValue.toLowerCase()) > -1);

export const PotentialOwner: FC<PotentialOwnerProps> = ({ selectedElement, modeler }) => {
  const { user, roles } = usePotentialOwnerStore();

  const { user: selectedUser, roles: selectedRoles } = useBPMNResources(
    selectedElement,
    'bpmn:PotentialOwner',
  );

  const options: Option[] = generateOptions(user, roles);

  function setPotentialOwner(value: string[][]) {
    if (modeler) {
      updateResource(
        'bpmn:PotentialOwner',
        selectedElement as Shape,
        modeler,
        { user, roles },
        value,
      );
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
                Responsible Parties
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
              value={[...selectedUser, ...selectedRoles]}
            />
          </>
        )}
      </Space>
    </>
  );
};

type ResponsibilityProps = {
  selectedElement: ElementLike;
  modeler: BPMNCanvasRef | null;
};

export const ResponsibleParty: FC<ResponsibilityProps> = ({ selectedElement, modeler }) => {
  const { user, roles } = usePotentialOwnerStore();

  const { user: selectedUser, roles: selectedRoles } = useBPMNResources(
    selectedElement,
    'proceed:ResponsibleParty',
  );

  if (!isAny(selectedElement, ['bpmn:Activity', 'bpmn:Gateway', 'bpmn:Event', 'bpmn:Process']))
    return null;

  const options: Option[] = generateOptions(user, roles);

  const setResponsible = (value: string[][]) => {
    if (modeler) {
      updateResource(
        'proceed:ResponsibleParty',
        selectedElement as Shape,
        modeler,
        { user, roles },
        value,
      );
    }
  };

  return (
    <>
      <Space
        direction="vertical"
        style={{ width: '100%' }}
        role="group"
        aria-labelledby="responsibility-selection"
      >
        <>
          <Divider style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem' }}>
            <span style={{ marginRight: '0.3em', marginBottom: '0.1rem' }}>
              Responsible Persons
            </span>
            <Tooltip
              title={
                <div>
                  Select User and Roles responsible for the execution (i.e. not necessarily the User
                  or Role that executes it).
                </div>
              }
            >
              <Button type="text" icon={<QuestionCircleOutlined />} />
            </Tooltip>
          </Divider>
          {/* User and Role selection */}
          <Cascader
            options={options}
            placeholder="Select User or Roles responsible"
            style={{ width: '100%' }}
            multiple
            showSearch={{ filter }}
            // @ts-ignore
            onChange={setResponsible}
            value={[...selectedUser, ...selectedRoles]}
          />
        </>
      </Space>
    </>
  );
};

export function useBPMNResources(
  selectedElement: ElementLike,
  resourcetype: 'bpmn:PotentialOwner' | 'proceed:ResponsibleParty',
) {
  const [roles, setRoles] = useState<string[][]>([]);
  const [user, setUser] = useState<string[][]>([]);

  const modeler = useModelerStateStore((state) => state.modeler);

  useEffect(() => {
    const eventBus = modeler?.getEventBus();

    if (eventBus) {
      const getResources = (el: Shape) => {
        const user: string[][] = [],
          roles: string[][] = [];
        el?.businessObject?.resources?.forEach((resource: any) => {
          if (
            resource.$type === resourcetype &&
            resource.resourceAssignmentExpression?.expression?.body
          ) {
            try {
              const { user: _user, roles: _roles } = JSON.parse(
                resource.resourceAssignmentExpression.expression.body,
              ) as {
                user: string[];
                roles: string[];
              };
              _user.forEach((id) => user.push(['all-user', `user|${id}`]));
              _roles.forEach((id) => roles.push(['all-roles', `roles|${id}`]));
            } catch {
              // console.error('Error parsing expression body');
            }
          }
        });
        return { user, roles };
      };

      const { user, roles } = getResources(selectedElement as Shape);
      setUser(user);
      setRoles(roles);

      const onUpdate = (event: any) => {
        if (event.context.properties?.resources) {
          const { user, roles } = getResources(event.context.element as Shape);
          setUser(user);
          setRoles(roles);
        }
      };

      eventBus.on('commandStack.element.updateModdleProperties.postExecuted', onUpdate);

      return () => {
        eventBus.off('commandStack.element.updateModdleProperties.postExecuted', onUpdate);
      };
    }
  }, [selectedElement, modeler]);

  return { user, roles };
}

export default PotentialOwner;
