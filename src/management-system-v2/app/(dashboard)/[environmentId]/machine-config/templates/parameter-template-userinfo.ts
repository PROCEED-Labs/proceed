import { Parameter, VirtualUserInfoParameter } from '@/lib/data/machine-config-schema';
import { defaultParameter } from '../helpers/configuration-helper';

export function createTemplateUserInfo(userId: string): VirtualUserInfoParameter {
  let team = defaultParameter({
    name: 'team',
    displayName: [
      {
        text: 'Team',
        language: 'en',
      },
      {
        text: 'Team',
        language: 'de',
      },
    ],
    description: [
      {
        text: 'Team description.',
        language: 'en',
      },
      {
        text: 'Teambeschreibung.',
        language: 'de',
      },
    ],
    origin: 'external',
  });

  let directManager = defaultParameter({
    name: 'direct-manager',
    displayName: [
      {
        text: 'Direct Manager',
        language: 'en',
      },
      {
        text: 'unmittelbarer Vorgesetzter',
        language: 'de',
      },
    ],
    description: [
      {
        text: 'Direct Manager of the user.',
        language: 'en',
      },
      {
        text: 'Unmittelbarer Vorgesetzter des Nutzers.',
        language: 'de',
      },
    ],
    origin: 'external',
  });

  let backOffice = defaultParameter({
    name: 'back-office',
    displayName: [
      {
        text: 'Back Office',
        language: 'en',
      },
      {
        text: 'Backoffice',
        language: 'de',
      },
    ],
    description: [
      {
        text: 'Back office of the user.',
        language: 'en',
      },
      {
        text: 'Backoffice des Nutzers.',
        language: 'de',
      },
    ],
    origin: 'external',
  });

  return {
    ...defaultParameter({
      name: 'user-info',
      displayName: [
        {
          text: 'User Info',
          language: 'en',
        },
        {
          text: 'Nutzer Informationen',
          language: 'de',
        },
      ],
      description: [
        {
          text: '',
          language: 'en',
        },
        {
          text: '',
          language: 'de',
        },
      ],
      subParameters: [team, directManager, backOffice],
      changeableByUser: false,
    }),
    userId,
    virtualType: 'user-info',
  };
}
