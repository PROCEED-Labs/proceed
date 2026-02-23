
const GLOBAL_CONFIG_ID = '55c0241f-fef0-4206-b0de-18a59275831d';
const HARDCODED_USER_ID = '00000000-0000-0000-0000-000000000000';

export type GlobalVariable = {
  path: string;       // e.g. "@global.@organization.data.ad"
  displayPath: string; // e.g. "Organization > data > ad"
  valueType: string;  // e.g. "xs:string"
};

type Parameter = {
  id: string;
  name: string;
  valueType?: string;
  subParameters: Parameter[];
  displayName?: { text: string; language: string }[];
};

/** Recursively collect leaf nodes and build dot-paths */
function collectLeaves(
  params: Parameter[],
  prefix: string,
  displayPrefix: string,
  result: GlobalVariable[],
) {
  for (const param of params) {
    const display = param.displayName?.find((d) => d.language === 'en')?.text || param.name;

    if (param.subParameters.length === 0 && param.valueType) {
      // genuine leaf with a value
      result.push({
        path: prefix ? `${prefix}.${param.name}` : param.name,
        displayPath: displayPrefix ? `${displayPrefix} > ${display}` : display,
        valueType: param.valueType,
      });
    } else if (param.subParameters.length > 0) {
      // container node — recurse
      collectLeaves(
        param.subParameters,
        prefix ? `${prefix}.${param.name}` : param.name,
        displayPrefix ? `${displayPrefix} > ${display}` : display,
        result,
      );
    }
    // if subParameters.length === 0 AND no valueType — skip entirely (empty container)
  }
}

export type GlobalVariableGroup = {
  label: string;
  variables: GlobalVariable[];
};

// REPLACE fetchGlobalVariables with:
export function parseGlobalVariables(config: any): GlobalVariableGroup[] {
  const content: Parameter[] = config.content ?? [];
  const groups: GlobalVariableGroup[] = [];

  for (const topLevel of content) {
    if (topLevel.name === 'organization') {
      const vars: GlobalVariable[] = [];
      collectLeaves(topLevel.subParameters, '@global.@organization', 'Organization', vars);
      if (vars.length) groups.push({ label: 'Organization', variables: vars });

    } else if (topLevel.name === 'identity-and-access-management') {
      for (const iamChild of topLevel.subParameters) {
if (iamChild.name === 'common-user-data') {
  const vars: GlobalVariable[] = [];
  collectLeaves(iamChild.subParameters, '@global.data', 'User (Common)', vars);
  if (vars.length) groups.push({ label: 'User (Common)', variables: vars });
} else if (iamChild.name === 'user') {
          const userNode = iamChild.subParameters.find(
            (p) => p.name === HARDCODED_USER_ID,
          );
          if (userNode) {
            const vars: GlobalVariable[] = [];
            collectLeaves(userNode.subParameters, '@global.@worker', 'Worker / Process Initiator', vars);
            if (vars.length) groups.push({ label: 'Worker / Process Initiator', variables: vars });
          }
        }
      }
    }
  }

  return groups;
}
// ADD this new export function at the bottom of global-data-objects.ts

export function buildValueMap(config: any): Record<string, string> {
  const result: Record<string, string> = {};
  const content: Parameter[] = config.content ?? [];

  function collectValues(params: Parameter[], prefix: string) {
    for (const param of params) {
      if (param.subParameters.length === 0 && param.valueType) {
        result[prefix ? `${prefix}.${param.name}` : param.name] = (param as any).value ?? '';
      } else {
        collectValues(
          param.subParameters,
          prefix ? `${prefix}.${param.name}` : param.name,
        );
      }
    }
  }

  for (const topLevel of content) {
    if (topLevel.name === 'organization') {
      collectValues(topLevel.subParameters, '@global.@organization');
    } else if (topLevel.name === 'identity-and-access-management') {
      for (const iamChild of topLevel.subParameters) {
if (iamChild.name === 'common-user-data') {
  collectValues(iamChild.subParameters, '@global.data');
} else if (iamChild.name === 'user') {
          const userNode = iamChild.subParameters.find(
            (p) => p.name === '00000000-0000-0000-0000-000000000000',
          );
          if (userNode) {
            collectValues(userNode.subParameters, '@global.@worker');
          }
        }
      }
    }
  }

  return result;
}