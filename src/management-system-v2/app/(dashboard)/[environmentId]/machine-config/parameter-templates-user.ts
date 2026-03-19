import { Parameter } from '@/lib/data/machine-config-schema';

import { defaultParameter } from './configuration-helper';

//---------------- User Template ----------------
// TODO loading from Organization Template not implemented yet
export function defaultUserParameterTemplate(
  userId: string,
  membershipId: string,
  firstName: string,
  lastName: string,
): Parameter {
  const userParameter = defaultParameter(
    userId,
    [{ text: `${lastName}, ${firstName}`, language: 'en' }],
    [],
  );
  const dataParameter: Parameter = {
    ...defaultParameter('data', [{ text: `Data`, language: 'en' }], []),
    changeableByUser: false,
  };

  userParameter.id = membershipId;
  userParameter.subParameters = [dataParameter];

  return userParameter;
}
