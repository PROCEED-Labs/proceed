'use client';

import { Modal, Typography, Space, Divider, Alert } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import { Config } from '@/lib/data/machine-config-schema';
import { useEffect, useState } from 'react';
import {
  sendViaMqtt,
  getDeepConfigurationById,
  getlastVersion,
} from '@/lib/data/db/machine-config';
import { wrapServerCall } from '@/lib/wrap-server-call';
import { App as AntApp } from 'antd';

const { Text, Title } = Typography;

type ReleaseModalProps = {
  open: boolean;
  onCancel: () => void;
  onRelease: () => Promise<void>;
  parentConfig: Config;
  mqttBrokerUrl?: string;
  mqttTopic: string;
  mqttUsername: string;
  mqttPassword: string;
  versionChangeState: {
    tdsVersionInfo: { hasChanges: boolean; currentVersion: string; nextVersion: string };
    machineDatasets: Array<{
      id: string;
      name: string;
      hasChanges: boolean;
      currentVersion: string;
      nextVersion: string;
    }>;
  } | null;
};

const ReleaseModal: React.FC<ReleaseModalProps> = ({
  open,
  onCancel,
  onRelease,
  parentConfig,
  mqttBrokerUrl,
  mqttTopic,
  mqttUsername,
  mqttPassword,
  versionChangeState,
}) => {
  const app = AntApp.useApp();
  const [loading, setLoading] = useState(false);

  const handleSendViaMqtt = async (configToSend: Config) => {
    if (!mqttBrokerUrl) {
      return;
    }

    try {
      app.message.info('Sending to middleware...');
      await wrapServerCall({
        fn: () => sendViaMqtt(mqttBrokerUrl, mqttTopic, configToSend, mqttUsername, mqttPassword),
        onSuccess: () => {
          app.message.success('TDS successfully sent to middleware.');
        },
        onError(error) {
          if (error.message?.toString().includes('getaddrinfo ENOTFOUND')) {
            app.message.error('TDS could not be sent to middleware. Middleware not reachable.');
          } else {
            app.message.error(error.message);
          }
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        console.log(error.message);
      } else {
        console.log(String(error));
      }
    }
  };

  const handleRelease = async () => {
    setLoading(true);
    try {
      // wait for onRelease to complete before proceeding
      await onRelease();

      // only proceed to MQTT if the release was successful
      if (mqttBrokerUrl && versionChangeState) {
        // fetch the newly created version
        const newVersionNumber = parseInt(versionChangeState.tdsVersionInfo.nextVersion);

        // load the newly created TDS version with latest machine dataset versions
        const newlyCreatedConfig = await getlastVersion(parentConfig.id, newVersionNumber);

        // Send to MQTT
        await handleSendViaMqtt(newlyCreatedConfig);
      }
    } catch (error) {
      app.message.error('Release failed');
    } finally {
      setLoading(false);
    }
  };

  if (!versionChangeState) {
    return null;
  }

  const { tdsVersionInfo, machineDatasets } = versionChangeState;
  const hasAnyChanges = tdsVersionInfo.hasChanges || machineDatasets.some((m) => m.hasChanges);
  const isMqttConfigured = mqttBrokerUrl !== undefined;

  return (
    <Modal
      title="Release Tech Data Set: Create new Version"
      open={open}
      onCancel={onCancel}
      onOk={handleRelease}
      okText="Release"
      cancelText="Cancel"
      width={700}
      confirmLoading={loading}
      okButtonProps={{
        disabled: !hasAnyChanges,
      }}
    >
      <Space orientation="vertical" style={{ width: '100%' }} size="large">
        <Text>
          Do you want to release the latest changes in this Tech Data Set as a new version?
        </Text>

        <Divider style={{ margin: '12px 0' }} />

        {/* Config Set Version */}
        <div>
          <Title level={5}>Tech Data Set</Title>
          {(() => {
            const versionChanged = tdsVersionInfo.currentVersion !== tdsVersionInfo.nextVersion;
            const hasActualChanges = tdsVersionInfo.hasChanges && versionChanged;

            return hasActualChanges ? (
              <Space orientation="vertical" style={{ width: '100%' }}>
                <Text>
                  There have been structural or content changes in Header, Target Dataset, or
                  Reference Dataset compared to the previous version.
                </Text>
                <Space align="center">
                  <Text strong>New version number:</Text>
                  <Text code>{tdsVersionInfo.currentVersion}</Text>
                  <ArrowRightOutlined />
                  <Text code strong type="success">
                    {tdsVersionInfo.nextVersion}
                  </Text>
                </Space>
              </Space>
            ) : (
              <Text>
                There have been no structural or content changes in Header, Target Dataset, or
                Reference Dataset compared to the previous version.
              </Text>
            );
          })()}
        </div>

        <Divider style={{ margin: '12px 0' }} />

        {/* Machine Datasets */}
        <div>
          <Title level={5}>Machine Datasets</Title>
          <Space orientation="vertical" style={{ width: '100%' }} size="middle">
            {machineDatasets.map((dataset) => (
              <div key={dataset.id}>
                <Text strong>{dataset.name}: </Text>
                {dataset.hasChanges ? (
                  <Space orientation="vertical" style={{ width: '100%', marginTop: 8 }}>
                    <Text>
                      There have been structural or content changes compared to the previous
                      version.
                    </Text>
                    <Space align="center">
                      <Text>New machine dataset version:</Text>
                      <Text code>{dataset.currentVersion}</Text>
                      <ArrowRightOutlined />
                      <Text code strong type="success">
                        {dataset.nextVersion}
                      </Text>
                    </Space>
                  </Space>
                ) : (
                  <Text>
                    There have been no structural or content changes in this Machine Dataset
                    compared to the previous version.
                  </Text>
                )}
              </div>
            ))}
          </Space>
        </div>

        {isMqttConfigured && hasAnyChanges && (
          <Alert
            title="After releasing, the configuration will automatically be sent to the MQTT server."
            type="info"
            showIcon
            style={{ fontSize: '0.65rem' }}
          />
        )}
        {!isMqttConfigured && hasAnyChanges && (
          <Alert
            title="After releasing, the configuration will not be sent to a MQTT server, because there is no server configured in the settings."
            type="warning"
            showIcon
            style={{ fontSize: '0.65rem' }}
          />
        )}
      </Space>
    </Modal>
  );
};

export default ReleaseModal;
