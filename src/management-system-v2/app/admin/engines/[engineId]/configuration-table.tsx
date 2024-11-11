'use client';

import { endpointBuilder } from '@/lib/engines/endpoint';
import { mqttRequest } from '@/lib/engines/server-actions';
import { wrapServerCall } from '@/lib/wrap-server-call';
import {
  App,
  Button,
  Card,
  Divider,
  Form,
  Input,
  InputNumber,
  Space,
  Switch,
  Tabs,
  TabsProps,
  Typography,
} from 'antd';
import { useRouter } from 'next/navigation';
import { Fragment, ReactNode, useTransition } from 'react';
import styles from './engine-overview.module.scss';

// NOTE: the config assumes that the configuration has only one level of nesting

function AdaptableInput({ type, ...props }: { type: any }) {
  if (type === 'string') return <Input {...props} />;
  else if (type === 'number') return <InputNumber {...props} />;
  else if (type === 'boolean') return <Switch {...props} />;
}

function Field({ field, path }: { field: any | any[]; path: string[] }) {
  if (!(field instanceof Array))
    return (
      <Form.Item name={path} label={path.at(-1)}>
        <AdaptableInput type={typeof field} />
      </Form.Item>
    );

  const listType = field[0] ? typeof field[0] : 'string';

  return (
    <>
      <Typography.Text>{path.at(-1)}:</Typography.Text>
      <br />
      <Form.List name={path}>
        {(fields, { add, remove }) => (
          <>
            {fields.map((field, idx) => (
              <Space style={{ alignItems: 'center', width: '100%' }} key={idx}>
                <Form.Item {...field} style={{ margin: 0 }} key={`${idx}.field`}>
                  <AdaptableInput type={listType} />
                </Form.Item>
                <Button onClick={() => remove(idx)}>Remove</Button>
              </Space>
            ))}
            <Button onClick={() => add()}>Add</Button>
          </>
        )}
      </Form.List>
    </>
  );
}

// Sepparate component to keep the loading state from causing a re-render on
// the list
function FormWrapper({
  children,
  engine,
  configuration,
}: {
  children: ReactNode;
  engine: { id: string };
  configuration: any;
}) {
  const app = App.useApp();
  const router = useRouter();
  const [updatingConfig, startUpdatingConfig] = useTransition();

  async function updateConfiguration(values: any) {
    startUpdatingConfig(() =>
      wrapServerCall({
        fn: () =>
          mqttRequest(engine.id, endpointBuilder('put', '/configuration/'), {
            method: 'PUT',
            body: values,
          }),
        onSuccess: () => {
          app.message.success('Configuration updated');
          router.refresh();
        },
        app: app,
      }),
    );
  }

  return (
    <Form
      layout="horizontal"
      initialValues={configuration}
      style={{ height: '100%' }}
      onFinish={updateConfiguration}
    >
      <>
        {children}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'right' }}>
          <Button loading={updatingConfig} htmlType="submit" type="primary">
            Save changes
          </Button>
        </div>
      </>
    </Form>
  );
}

/**
 * This component is flexible to render one level of nested configuration
 * With the exception of 'name' and 'description' which are grouped together
 */
export default function ConfigurationTable({
  configuration: configuration,
  engine,
}: {
  configuration: any;
  engine: { id: string };
}) {
  const menuItems: TabsProps['items'] = Object.keys(configuration)
    .filter((key) => !['name', 'description'].includes(key))
    .map((conf) => ({
      label: conf,
      key: conf,
      children: Object.keys(configuration[conf]).map((key, idx) => (
        <Fragment key={`${conf}.${key}`}>
          <Field field={configuration[conf][key]} path={[conf, key]} />
          {idx !== Object.keys(configuration[conf]).length - 1 && <Divider />}
        </Fragment>
      )),
    }));
  menuItems.unshift({
    key: 'general',
    label: 'General',
    children: (
      <>
        <Field field={configuration['name']} path={['name']} key="general.name" />
        <Divider />
        <Field
          field={configuration['description']}
          path={['description']}
          key="general.description"
        />
      </>
    ),
  });

  return (
    <Card
      style={{
        height: '100%',
      }}
    >
      <FormWrapper engine={engine} configuration={configuration}>
        <Tabs
          defaultActiveKey="general"
          tabPosition="left"
          items={menuItems}
          className={styles.configurationTabs}
        />
      </FormWrapper>
    </Card>
  );
}
