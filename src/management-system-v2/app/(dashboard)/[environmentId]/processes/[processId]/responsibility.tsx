import type { BPMNCanvasRef } from '@/components/bpmn-canvas';
import type { ElementLike } from 'diagram-js/lib/core/Types';
import { FC } from 'react';
import usePotentialOwnerStore from './use-potentialOwner-store';
import { Divider, Space, Tooltip, Button, Cascader } from 'antd';
import type { CascaderProps, GetProp } from 'antd';
import { UserOutlined, TeamOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { generateOptions, getSelectedUserAndRoles } from './potential-owner';
import type { DefaultOptionType, Option } from './potential-owner';
import { resources } from '@/lib/ability/caslAbility';

type ResponsibilityProps = {
  selectedElement: ElementLike;
  modeler: BPMNCanvasRef | null;
};

const ResponisbilitySelection: FC<ResponsibilityProps> = ({ selectedElement, modeler }) => {
  const { user, roles } = usePotentialOwnerStore();

  /**
   * Responsibiliy should be selectable for
   * - Tasks / Activities
   * - User Tasks
   * - Gateways
   * - Events
   * - The process itself
   */
  //   const validTypes = ['bpmn:Task', 'bpmn:UserTask', 'bpmn:Gateway', 'bpmn:Event', 'bpmn:Process'];
  //   const validTypesRegex = /activity|task|gateway|event|process/i;
  const validTypesRegex = /activity|task|process/i;

  console.log(selectedElement.type);

  if (!validTypesRegex.test(selectedElement.type)) return null;

  const { user: selectedUser, roles: selectedRoles } = getSelectedUserAndRoles(
    selectedElement,
    'bpmn:Performer',
  );

  const options: Option[] = generateOptions(user, roles);

  const filter = (inputValue: string, path: DefaultOptionType[]) =>
    path.some((option) => option.value.toLowerCase().indexOf(inputValue.toLowerCase()) > -1);

  const setResponsible = (value: string[][]) => {
    const potentialResponsibleIds = value
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

      let performers: any[] = [];

      if (potentialResponsibleIds.roles.length || potentialResponsibleIds.user.length) {
        const expression = factory.create('bpmn:Expression', {
          body: JSON.stringify(potentialResponsibleIds),
        });
        const resourceAssignmentExpression = factory.create('bpmn:ResourceAssignmentExpression', {
          expression,
        });
        const performer = factory.create('bpmn:Performer', {
          resourceAssignmentExpression,
        });

        performers = [performer];
      }

      modeling.updateModdleProperties(selectedElement as any, selectedElement.businessObject, {
        resources: performers,
      });
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
                  Select User and Roles responsible for the exection (i.e. not necessarily the User
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
            defaultValue={[...selectedUser, ...selectedRoles]}
          />
        </>
      </Space>
    </>
  );
};

export default ResponisbilitySelection;
