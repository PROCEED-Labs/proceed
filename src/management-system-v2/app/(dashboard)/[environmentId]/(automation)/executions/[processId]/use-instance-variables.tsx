import { useEffect, useMemo, useState } from 'react';
import type { Variable as ProcessVariable } from '@proceed/bpmn-helper/src/getters';
import { getProcessIds, getVariablesFromElementById } from '@proceed/bpmn-helper';
import { DeployedProcessInfo, InstanceInfo, VersionInfo } from '@/lib/engines/deployment';

export type Variable = {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'unknown';
  allowed?: string;
  value: any;
};

type DeploymentInfo = {
  process?: DeployedProcessInfo | null;
  version?: VersionInfo;
  instance?: InstanceInfo | undefined;
};

const useInstanceVariables = (info: DeploymentInfo) => {
  const [variableDefinitions, setVariableDefinitions] = useState<ProcessVariable[]>([]);

  useEffect(() => {
    const initVariables = async (version: VersionInfo) => {
      const [processId] = await getProcessIds(version.bpmn);
      const variables = await getVariablesFromElementById(version.bpmn, processId);
      setVariableDefinitions(variables);
    };
    if (info.version) initVariables(info.version);

    return () => setVariableDefinitions([]);
  }, [info.version]);

  const variables = useMemo(() => {
    const { instance } = info;

    const variables: Record<string, Variable> = {};

    if (instance) {
      const instanceVariables = instance.variables as Record<string, { value: any }>;

      Object.entries(instanceVariables).forEach(([name, { value }]) => {
        let type: Variable['type'] = 'unknown';
        const valueType = typeof value;
        switch (valueType) {
          case 'number':
          case 'boolean':
          case 'string':
            type = valueType;
            break;
          case 'object': {
            if (Array.isArray(value)) {
              type = 'array';
              break;
            } else if (value) {
              type = 'object';
              break;
            }
          }
        }

        variables[name] = { name, type, value };
      });
    }

    variableDefinitions.forEach((def) => {
      if (!variables[def.name]) {
        variables[def.name] = {
          name: def.name,
          type: def.dataType as Variable['type'],
          value: undefined,
        };
      }
      if (variables[def.name].type === 'unknown') {
        variables[def.name].type = def.dataType as Variable['type'];
      }
      if (!instance && def.defaultValue) {
        switch (def.dataType) {
          case 'string':
            variables[def.name].value = def.defaultValue;
            break;
          case 'number':
            variables[def.name].value = parseFloat(def.defaultValue);
            break;
          case 'boolean':
            variables[def.name].value = def.defaultValue === 'true' ? true : false;
            break;
        }
      }

      variables[def.name].allowed = def.enum;
    });

    return Object.values(variables);
  }, [variableDefinitions, info.instance]);

  return { variableDefinitions, variables };
};

export default useInstanceVariables;
