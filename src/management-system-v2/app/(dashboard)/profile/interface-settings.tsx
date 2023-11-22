import { FC } from 'react';
import { Alert, Card, Select, Switch, Table, Typography } from 'antd';
import { useUserPreferences } from '@/lib/user-preferences';
import styles from './user-profile.module.scss';

const InterfaceSettings: FC = () => {
  const { preferences, addPreferences } = useUserPreferences();

  return (
    <Card style={{ margin: 'auto' }}>
      <Typography.Title level={3}>Graphical Settings</Typography.Title>

      <Table
        dataSource={[
          {
            title: 'Interface Size',
            value: (
              <Select
                value={preferences['interface-size']}
                onChange={(value) =>
                  addPreferences({
                    'interface-size': value,
                  })
                }
                options={[
                  {
                    label: 'Small',
                    value: 'small',
                  },
                  {
                    label: 'Middle',
                    value: 'middle',
                  },
                  {
                    label: 'Large',
                    value: 'large',
                  },
                ]}
              />
            ),
          },
          {
            title: (
              <Alert
                message="Experimental: Dark Mode"
                type="warning"
                style={{ width: 'fit-content' }}
              />
            ),
            value: (
              <Switch
                checked={preferences['dark-mode-enabled']}
                onChange={(value) => addPreferences({ 'dark-mode-enabled': value })}
              />
            ),
          },
        ]}
        columns={[{ dataIndex: 'title' }, { dataIndex: 'value' }]}
        showHeader={false}
        pagination={false}
        className={styles.Table}
      />
    </Card>
  );
};

export default InterfaceSettings;
