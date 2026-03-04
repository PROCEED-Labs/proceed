import { Parameter, VirtualParameter } from '@/lib/data/machine-config-schema';

type FilteredParameter = Pick<Parameter, 'name' | 'value' | 'id'> & {
  description?: string;
  displayName?: string;
};

type NestedFilteredParameter = FilteredParameter & { subParameters: NestedFilteredParameter[] };

export function filterParameter(parameter: Parameter): NestedFilteredParameter {
  return {
    name: parameter.name,
    value: parameter.value,
    id: parameter.id,
    description: parameter.description?.[0].text,
    displayName: parameter.displayName[0].text,
    subParameters: parameter.subParameters.map(filterParameter),
  };
}
