import { sendViaMqtt } from '@/lib/data/db/machine-config';
import { wrapServerCall } from '@/lib/wrap-server-call';
import { App, Button } from 'antd';
import { useEffect, useState } from 'react';

type MqttPublishButtonProps = {
  mqttBrokerUrl: string | undefined;
  mqttTopic: string;
  payload: any;
  username: string;
  password: string;
  successMessage?: string;
};

export const MqttPublishButton: React.FC<MqttPublishButtonProps> = ({
  mqttBrokerUrl,
  mqttTopic,
  payload,
  username,
  password,
  successMessage = 'Payload sent to MQTT broker!',
}) => {
  const app = App.useApp();
  const [buttonLoading, setButtonLoading] = useState<boolean>(false);

  const handleSendViaMqtt = async () => {
    if (mqttBrokerUrl) {
      setButtonLoading(true);
      app.message.info('Sending...');

      wrapServerCall({
        fn: () => sendViaMqtt(mqttBrokerUrl, mqttTopic, payload, username, password),
        onSuccess: successMessage,
        onError(error) {
          if (error.message?.toString().includes('getaddrinfo ENOTFOUND')) {
            app.message.error('TDS could not be sent to middleware. Middleware not reachable.');
          } else {
            app.message.error(error.message);
          }
        },
      });

      setButtonLoading(false);
    }
  };

  return (
    <Button
      onClick={handleSendViaMqtt}
      loading={buttonLoading}
      disabled={mqttBrokerUrl == undefined}
    >
      Send to Middleware
    </Button>
  );
};
