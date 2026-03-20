import { Parameter, VirtualUserParameter } from '@/lib/data/machine-config-schema';

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
  userParameter.subParameters = [dataParameter, createTemplateUserInfo(userId)];

  return userParameter;
}

function createTemplateUserInfo(userId: string): Parameter {
  let newUserInfo: VirtualUserParameter = {
    ...defaultParameter(
      'userInfo',
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
  };

  let firstName: Parameter = {
    ...defaultParameter(
      'firstName',
      [
        {
          text: 'First Name',
          language: 'en',
        },
        {
          text: 'Vorname',
          language: 'de',
        },
      ],
      [
        {
          text: 'First name of the user.',
          language: 'en',
        },
        {
          text: 'Vorname des Nutzers.',
          language: 'de',
        },
      ],
    ),
    origin: 'external',
  };

  let lastName: Parameter = {
    ...defaultParameter(
      'lastName',
      [
        {
          text: 'Last Name',
          language: 'en',
        },
        {
          text: 'Nachname',
          language: 'de',
        },
      ],
      [
        {
          text: 'Last name of the user.',
          language: 'en',
        },
        {
          text: 'Nachname des Nutzers.',
          language: 'de',
        },
      ],
    ),
    origin: 'external',
  };

  let username: Parameter = {
    ...defaultParameter(
      'username',
      [
        {
          text: 'Username',
          language: 'en',
        },
        {
          text: 'Nutzername',
          language: 'de',
        },
      ],
      [
        {
          text: 'Username of the user.',
          language: 'en',
        },
        {
          text: 'Nutzername des Nutzers.',
          language: 'de',
        },
      ],
    ),
    origin: 'external',
  };

  let email: Parameter = {
    ...defaultParameter(
      'email',
      [
        {
          text: 'E-Mail',
          language: 'en',
        },
        {
          text: 'E-Mail',
          language: 'de',
        },
      ],
      [
        {
          text: 'E-Mail address of the user.',
          language: 'en',
        },
        {
          text: 'E-Mail-Adresse des Nutzers.',
          language: 'de',
        },
      ],
    ),
    origin: 'external',
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
      'directManager',
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
      'backOffice',
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
    subParameters: [firstName, lastName, username, email, team, directManager, backOffice],
    changeableByUser: false,
  };
}
