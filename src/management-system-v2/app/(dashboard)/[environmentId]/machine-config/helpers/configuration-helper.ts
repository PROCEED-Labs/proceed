import {
  Config,
  LinkedParameter,
  LocalizedText,
  MetaAttribute,
  Parameter,
  MetaParameter,
  VirtualUserInfoParameter,
  VirtualUserRolesParameter,
  VirtualOrganizationRolesParameter,
} from '@/lib/data/machine-config-schema';
import { WithRequired } from '@/lib/typescript-utils';
import { v4 } from 'uuid';

/**
 * Creates a parameter of type Parameter.
 * @param params A Partial of Type Parameter with the required field 'name'
 */
export function defaultParameter(params: WithRequired<Partial<Parameter>, 'name'>): Parameter {
  return {
    id: v4(),
    parameterType: 'none',
    displayName: [],
    description: [],
    subParameters: [],
    structureVisible: true,
    usedAsInputParameterIn: [],
    changeableByUser: true,
    origin: null,
    hasChanges: false,
    ...params,
  };
}
/**
 * Creates a parameter of type MetaParameter.
 * @param params A Partial of Type MetaParameter with the required fields 'name' and 'valueTemplateSource'
 */
export function defaultMetaParameter(
  params: WithRequired<Partial<MetaParameter>, 'name' | 'valueTemplateSource'>,
): MetaParameter {
  return {
    id: v4(),
    parameterType: 'none',
    displayName: [],
    description: [],
    subParameters: [],
    structureVisible: true,
    usedAsInputParameterIn: [],
    changeableByUser: true,
    origin: null,
    hasChanges: false,
    ...params,
  };
}

export function defaultConfiguration(
  environmentId: string,
  name?: string,
  shortname?: string,
  description?: string,
  category?: string[],
): Config {
  const date = new Date();
  let newShortname: MetaAttribute = {
    value: shortname ?? 'TDS (new)',
    linkValueToParameterValue: { id: '', path: ['Header', 'TDSIdentifier'] },
  };
  let newName: MetaAttribute = {
    value: name ?? 'Tech Data Set (new)',
    linkValueToParameterValue: { id: '', path: ['Header', 'Name'] },
  };
  let newDescription: MetaAttribute = {
    value: description ?? ' ',
    linkValueToParameterValue: { id: '', path: ['Header', 'Description'] },
  };
  let newCategory: MetaAttribute = {
    value: category ? category.join(';') : '',
    linkValueToParameterValue: { id: '', path: ['Header', 'Categories'] },
  };

  const config = {
    id: v4(),
    versionId: v4(),
    versionPreviousConfigSetId: undefined,
    templateId: undefined,
    shortName: newShortname,
    name: newName,
    description: newDescription,
    category: newCategory,
    content: [],
    versions: [],
    folderId: '',
    environmentId,
    createdBy: '',
    createdOn: date,
    lastEditedBy: '',
    lastEditedOn: date,
    type: 'config',
    sharedAs: 'protected',
    shareTimestamp: 0,
    allowIframeTimestamp: 0,
    hasChanges: false,
    configType: 'default',
  } as Config;

  return config;
}

export const defaultParentConfiguration = (
  folderId: string,
  environmentId: string,
  name?: string,
  shortname?: string,
  description?: string,
  category?: string[],
): Config => {
  return {
    ...defaultConfiguration(environmentId, name, shortname, description, category),
    folderId,
  } as Config;
};

export type TreeSearchedParameter =
  | {
      selection: Parameter | Parameter;
      parent: Config | Parameter;
      type: Parameter['parameterType'];
    }
  | undefined;

export function findParameter(
  id: string,
  _parent: Config | Parameter,
  type: 'config' | 'parameter',
): TreeSearchedParameter {
  let found = undefined;
  if (type === 'config') {
    let parent = _parent as Config;
    for (let parameter of parent.content) {
      if (parameter.id === id) {
        return { selection: parameter, parent: parent, type: parameter.parameterType };
      }
      found = findParameter(id, parameter, 'parameter');
      if (found) return found;
    }
    if (found) return found;
  } else {
    // search in parameter parent
    let parent = _parent as Parameter;
    for (let parameter of parent.subParameters) {
      if (parameter.id === id) {
        return { selection: parameter, parent: parent, type: parameter.parameterType };
      }
      found = findParameter(id, parameter, 'parameter');
      if (found) return found;
    }
  }
  return found;
}

/**
 * Returns a list of all parameters under a parent paired with their "path" to create unique keys
 * @param _parent A config or a parameter that is to be searched.
 * @param type Type of the parent. _"config" | "parameter"_
 * @param path Path describing the parent parameter. Empty for parent config.
 * @returns
 */
export function getAllParameters(
  _parent: Config | Parameter,
  type: 'config' | 'parameter',
  path: string,
): { key: string; value: Parameter }[] {
  let found: { key: string; value: Parameter }[] = [];
  if (type === 'config') {
    let parent = _parent as Config;
    for (let parameter of parent.content) {
      const nextPath = parent.name.value + '.';
      found.push({ key: nextPath + parameter.name, value: parameter });
      found = found.concat(
        getAllParameters(parameter, 'parameter', path + nextPath + parameter.name + '.'),
      );
    }
  } else {
    let parent = _parent as Parameter;
    for (let parameter of parent.subParameters) {
      const nextPath = path;
      found.push({
        key: nextPath + parameter.name,
        value: parameter,
      });
      found = found.concat(
        getAllParameters(parameter, 'parameter', nextPath + parameter.name + '.'),
      );
    }
  }
  return found;
}

export function buildLinkedInputParametersFromIds(
  parameterIds: string[],
  parent: Config,
): LinkedParameter[] {
  return parameterIds.map((id) => ({
    id,
    path: findPathToParameter(id, parent, [], 'config'),
  }));
}

export function findPathToParameter(
  id: string,
  _parent: Config | Parameter,
  path: string[],
  type: 'config' | 'parameter',
): string[] {
  let found: string[] = [];
  if (type === 'config') {
    let parent = _parent as Config;
    for (const parameter of parent.content) {
      let parameterPath = Array.from(path);
      parameterPath.push(parameter.name);
      if (parameter.id === id) {
        return parameterPath;
      }
      found = findPathToParameter(id, parameter, parameterPath, 'parameter');
      if (found.length) return found;
    }
  } else {
    // search in parameter parent
    let parent = _parent as Parameter;
    for (const parameter of parent.subParameters) {
      let parameterPath = Array.from(path);
      parameterPath.push(parameter.name);
      if (parameter.id === id) {
        return parameterPath;
      }
      found = findPathToParameter(id, parameter, parameterPath, 'parameter');
      if (found.length) return found;
    }
  }
  return found;
}

/**
 * Extracts a parameter at a given path from a config.
 */
export function extractParameter(configOrParameter: Config | Parameter, path: string[]) {
  if (!path.length) return;

  let current: Parameter | undefined;
  if ('content' in configOrParameter) {
    current = configOrParameter.content.find((p) => p.name === path[0]);
    path = path.slice(1);
  } else current = configOrParameter;

  for (let i = 0; i < path.length && current; i++) {
    current = current.subParameters?.find((p) => p.name === path[i]);
  }

  return current;
}

export function isVirtualUserInfoParameter(p: unknown): p is VirtualUserInfoParameter {
  return isNonNullObject(p) && 'userId' in p && 'virtualType' in p && p.virtualType == 'user-info';
}

export function isVirtualUserRolesParameter(p: unknown): p is VirtualUserRolesParameter {
  return (
    isNonNullObject(p) &&
    'userId' in p &&
    'environmentId' in p &&
    'virtualType' in p &&
    p.virtualType == 'user-roles'
  );
}

export function isVirtualOrganizationRolesParameter(
  p: unknown,
): p is VirtualOrganizationRolesParameter {
  return (
    isNonNullObject(p) && 'environmentId' in p && 'virtualType' in p && p.virtualType == 'org-roles'
  );
}

function isNonNullObject(p: unknown): p is object {
  return typeof p === 'object' && p !== null;
}

export function stringifyValue(value: any): string {
  return typeof value === 'string' ? value : JSON.stringify(value);
}
