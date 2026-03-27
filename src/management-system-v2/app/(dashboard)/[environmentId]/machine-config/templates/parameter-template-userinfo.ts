import { Parameter, VirtualUserInfoParameter } from '@/lib/data/machine-config-schema';
import { defaultParameter } from '../helpers/configuration-helper';

export function createTemplateUserInfo(userId: string): Parameter {
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
