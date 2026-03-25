import {
  LocalizedText,
  Parameter,
  VirtualUserInfoParameter,
  VirtualUserRolesParameter,
} from '@/lib/data/machine-config-schema';

import { defaultParameter } from './configuration-helper';
import { Membership } from '@prisma/client';

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
// TODO loading from Organization Template not implemented yet
export function defaultUserParameterTemplate(
  membership: Membership,
  firstName: string,
  lastName: string,
): Parameter {
  function createTemplateUserInfo(userId: string): Parameter {
    let newUserInfo: VirtualUserInfoParameter = {
      ...defaultParameter(
        'user-info',
        [
          {
            text: 'User Info',
            language: 'en',
          },
          {
            text: 'Nutzer Informationen',
            language: 'de',
          },
        ],
        [
          {
            text: '',
            language: 'en',
          },
          {
            text: '',
            language: 'de',
          },
        ],
      ),
      userId,
      virtualType: 'user-info',
    };

    let team: Parameter = {
      ...defaultParameter(
        'team',
        [
          {
            text: 'Team',
            language: 'en',
          },
          {
            text: 'Team',
            language: 'de',
          },
        ],
        [
          {
            text: 'Team description.',
            language: 'en',
          },
          {
            text: 'Teambeschreibung.',
            language: 'de',
          },
        ],
      ),
      origin: 'external',
    };

    let directManager: Parameter = {
      ...defaultParameter(
        'direct-manager',
        [
          {
            text: 'Direct Manager',
            language: 'en',
          },
          {
            text: 'unmittelbarer Vorgesetzter',
            language: 'de',
          },
        ],
        [
          {
            text: 'Direct Manager of the user.',
            language: 'en',
          },
          {
            text: 'Unmittelbarer Vorgesetzter des Nutzers.',
            language: 'de',
          },
        ],
      ),
      origin: 'external',
    };

    let backOffice: Parameter = {
      ...defaultParameter(
        'back-office',
        [
          {
            text: 'Back Office',
            language: 'en',
          },
          {
            text: 'Backoffice',
            language: 'de',
          },
        ],
        [
          {
            text: 'Back office of the user.',
            language: 'en',
          },
          {
            text: 'Backoffice des Nutzers.',
            language: 'de',
          },
        ],
      ),
      origin: 'external',
    };

    return {
      ...newUserInfo,
      // subParameters: [firstName, lastName, username, email, team, directManager, backOffice],
      subParameters: [team, directManager, backOffice],
      changeableByUser: false,
    };
  }

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
