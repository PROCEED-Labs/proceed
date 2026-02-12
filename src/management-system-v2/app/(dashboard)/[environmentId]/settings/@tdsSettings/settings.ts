import { SettingGroup } from '../type-util';

export const settings: SettingGroup = {
  key: 'tdsSettings',
  name: 'Tech Data Set Settings',
  children: [
    {
      key: 'mqttSettings',
      name: 'MQTT Server Settings for Connection to Middleware',
      children: [
        {
          key: 'mqttUrl',
          name: 'Broker URL',
          type: 'string',
          description: 'MQTT-Broker URL with port. E.g.: mqtt://test.mosquitto.org:1883',
          value: '',
        },
        {
          key: 'mqttTopic',
          name: 'Topic',
          type: 'string',
          description: 'MQTT-topic to publish to. E.g.: /werk4.0/ap1/techdatensets',
          value: '',
        },
        {
          key: 'mqttUsername',
          name: 'Username',
          type: 'string',
          description: 'Username for MQTT broker authentication.',
          value: '',
        },
        {
          key: 'mqttPassword',
          name: 'Password',
          type: 'string',
          description: 'Password for MQTT Username.',
          value: '',
        },
      ],
    },
  ],
};
