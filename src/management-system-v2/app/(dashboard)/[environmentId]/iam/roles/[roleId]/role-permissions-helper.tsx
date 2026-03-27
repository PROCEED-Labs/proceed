import Ability from '@/lib/ability/abilityHelper';
import { ResourceActionType, ResourceType } from '@/lib/ability/caslAbility';
import {
  ResourceActionsMapping,
  permissionIdentifiersToNumber,
} from '@/lib/authorization/permissionHelpers';
import { Role } from '@/lib/data/role-schema';
import { Fragment } from 'react/jsx-runtime';
import { Divider, Form, Row, Space, Switch, Typography } from 'antd';
import { useAbilityStore } from '@/lib/abilityStore';

export function switchChecked(
  permissions: Role['permissions'] | undefined,
  resources: keyof Role['permissions'] | (keyof Role['permissions'])[],
  action: ResourceActionType,
) {
  if (!permissions) return false;

  const resourceInPermissions =
    typeof resources === 'string'
      ? resources in permissions
      : resources.every((res) => res in permissions);
  if (!resourceInPermissions) return false;

  for (const resource of typeof resources === 'string' ? [resources] : resources) {
    const permissionNumber = permissions[resource]!;

    if (action === 'admin' && permissionNumber !== ResourceActionsMapping.admin) return false;
    // If admin is checked all other permissions are checked
    else if (action !== 'admin' && permissionNumber === ResourceActionsMapping.admin) continue;

    // bit check
    if (!(ResourceActionsMapping[action] & permissionNumber)) return false;
  }

  return true;
}

export function switchDisabled(
  permissions: Role['permissions'] | undefined,
  resources: keyof Role['permissions'] | (keyof Role['permissions'])[],
  action: ResourceActionType,
  ability: Ability,
) {
  if (action === 'admin' && !ability.can('admin', resources)) return true;

  if (!permissions) return false;

  const resourceInPermissions =
    typeof resources === 'string'
      ? resources in permissions
      : resources.every((res) => res in permissions);
  if (!resourceInPermissions) return false;

  for (const resource of typeof resources === 'string' ? [resources] : resources) {
    const permissionNumber = permissions[resource]!;
    if (permissionNumber === ResourceActionsMapping.admin && action !== 'admin') return true;
  }

  return false;
}

export type ResourceFormEntries = Record<ResourceType, Record<ResourceActionType, boolean>>;

export function formDataToPermissions(values: ResourceFormEntries) {
  return Object.fromEntries(
    Object.entries(values).map(([resource, actions]) => [
      resource,
      permissionIdentifiersToNumber(
        Object.entries(actions)
          .filter(([_, enabled]) => enabled)
          .map(([action]) => action as ResourceActionType),
      ),
    ]),
  );
}

type PermissionCategory = {
  key: string;
  title: string;
  resource: ResourceType;
  permissions: {
    key: string;
    title: string;
    description: string;
    permission: ResourceActionType;
  }[];
};

export function permissionsToFormData(
  options: PermissionCategory[],
  permissions: Role['permissions'],
) {
  return Object.fromEntries(
    options.map((entry) => [
      entry.resource,
      Object.fromEntries(
        entry.permissions.map(({ permission }) => [
          permission,
          switchChecked(permissions, entry.resource, permission),
        ]),
      ),
    ]),
  );
}

export const ResourcePermissionInputs: React.FC<{
  pathPrefix?: (string | number)[];
  options: PermissionCategory[];
  permissions: Role['permissions'];
}> = ({ pathPrefix = [], options, permissions }) => {
  const ability = useAbilityStore((store) => store.ability);

  return (
    <>
      {options.map((permissionCategory) => (
        <Fragment key={permissionCategory.key}>
          <Typography.Title type="secondary" level={5}>
            {permissionCategory.title}
          </Typography.Title>
          {permissionCategory.permissions.map((permission, idx) => (
            <Fragment key={permission.key}>
              <Row align="top" justify="space-between" wrap={false}>
                <Space orientation="vertical" size={0}>
                  <Typography.Text strong>{permission.title}</Typography.Text>
                  <Typography.Text type="secondary">{permission.description}</Typography.Text>
                </Space>
                <Form.Item
                  valuePropName="checked"
                  name={[...pathPrefix, permissionCategory.resource, permission.permission]}
                >
                  <Switch
                    disabled={switchDisabled(
                      permissions,
                      permissionCategory.resource,
                      permission.permission,
                      ability,
                    )}
                  />
                </Form.Item>
              </Row>
              {idx < permissionCategory.permissions.length - 1 && (
                <Divider style={{ marginTop: '10px', marginBottom: '10px' }} />
              )}
            </Fragment>
          ))}
          <br />
        </Fragment>
      ))}
    </>
  );
};
