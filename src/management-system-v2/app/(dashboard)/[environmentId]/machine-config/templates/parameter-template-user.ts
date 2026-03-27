import {
  LocalizedText,
  Parameter,
  VirtualUserRolesParameter,
} from '@/lib/data/machine-config-schema';

import { defaultParameter } from '../helpers/configuration-helper';
import { Membership } from '@prisma/client';
import { createTemplateUserInfo } from './parameter-template-userinfo';

export const userInfoMap: Record<
  string,
  { displayName: LocalizedText[]; description: LocalizedText[] }
> = {
  id: {
    displayName: [
      {
        text: 'ID',
        language: 'en',
      },
      {
        text: 'ID',
        language: 'de',
      },
    ],
    description: [
      {
        text: 'ID of the user.',
        language: 'en',
      },
      {
        text: 'ID des Nutzers',
        language: 'de',
      },
    ],
  },
  firstName: {
    displayName: [
      {
        text: 'First Name',
        language: 'en',
      },
      {
        text: 'Vorname',
        language: 'de',
      },
    ],
    description: [
      {
        text: 'First name of the user.',
        language: 'en',
      },
      {
        text: 'Vorname des Nutzers.',
        language: 'de',
      },
    ],
  },
  lastName: {
    displayName: [
      {
        text: 'Last Name',
        language: 'en',
      },
      {
        text: 'Nachname',
        language: 'de',
      },
    ],
    description: [
      {
        text: 'Last name of the user.',
        language: 'en',
      },
      {
        text: 'Nachname des Nutzers.',
        language: 'de',
      },
    ],
  },
  username: {
    displayName: [
      {
        text: 'Username',
        language: 'en',
      },
      {
        text: 'Nutzername',
        language: 'de',
      },
    ],
    description: [
      {
        text: 'Username of the user.',
        language: 'en',
      },
      {
        text: 'Nutzername des Nutzers.',
        language: 'de',
      },
    ],
  },
  email: {
    displayName: [
      {
        text: 'E-Mail',
        language: 'en',
      },
      {
        text: 'E-Mail',
        language: 'de',
      },
    ],
    description: [
      {
        text: 'E-Mail address of the user.',
        language: 'en',
      },
      {
        text: 'E-Mail-Adresse des Nutzers.',
        language: 'de',
      },
    ],
  },
  phoneNumber: {
    displayName: [
      {
        text: 'Phone number',
        language: 'en',
      },
      {
        text: 'Telefonnummer',
        language: 'de',
      },
    ],
    description: [
      {
        text: 'Phone number of the user.',
        language: 'en',
      },
      {
        text: 'Telefonnummer des Nutzers.',
        language: 'de',
      },
    ],
  },
};

//---------------- User Template ----------------
export function defaultUserParameterTemplate(
  membership: Membership,
  firstName: string,
  lastName: string,
): Parameter {
  const userParameter = defaultParameter(
    membership.userId,
    [{ text: `${lastName}, ${firstName}`, language: 'en' }],
    [],
  );
  const dataParameter: Parameter = {
    ...defaultParameter('data', [{ text: `Data`, language: 'en' }], []),
    changeableByUser: false,
  };
  const rolesParameter: VirtualUserRolesParameter = {
    ...defaultParameter('roles', [{ text: `Roles`, language: 'en' }], []),
    userId: membership.userId,
    environmentId: membership.environmentId,
    virtualType: 'user-roles',
    changeableByUser: false,
  };

  userParameter.id = membership.id;
  userParameter.subParameters = [
    dataParameter,
    rolesParameter,
    createTemplateUserInfo(membership.userId),
  ];

  return userParameter;
}
