import { type ExtractedProvider } from '@/app/(auth)/signin/page';
import { ReactNode, type FC, Fragment } from 'react';
import { Form, Input, Button, Divider, Typography, Image as AntDesignImage } from 'antd';

import { signIn } from 'next-auth/react';

const SignInOptions: FC<{
  providers: ExtractedProvider[];
  callbackUrl?: string;
}> = ({ providers, callbackUrl = '/' }) => {
  return (
    <>
      {providers.map((provider, idx) => {
        let loginMethod: ReactNode;
        if (provider.type === 'credentials') {
          loginMethod = (
            <Form
              name="normal_login"
              onFinish={(values) => signIn(provider.id, { ...values, callbackUrl })}
              key={provider.id}
              layout="vertical"
            >
              {Object.keys(provider.credentials).map((key) => (
                <Form.Item name={key} key={key} style={{ marginBottom: '.5rem' }}>
                  <Input placeholder={provider.credentials[key].label} />
                </Form.Item>
              ))}
              <Button type="primary" htmlType="submit" style={{ width: '100%' }}>
                Continue with {provider.name}
              </Button>
            </Form>
          );
        } else if (provider.type === 'oauth') {
          loginMethod = (
            <Button
              key={idx}
              style={{
                backgroundColor: provider.style?.bg,
                color: provider.style?.text,
                width: '100%',
                marginBottom: '.5rem',
              }}
              icon={
                <AntDesignImage
                  width={20}
                  src={`https://authjs.dev/img/providers${provider.style?.logo}`}
                  alt={provider.name}
                />
              }
              onClick={() => signIn(provider.id, { callbackUrl })}
            >
              Continue with {provider.name}
            </Button>
          );
        } else if (provider.type === 'email') {
          loginMethod = (
            <Form
              name="normal_login"
              onFinish={(values) => signIn(provider.id, { ...values, callbackUrl })}
              key={provider.id}
              layout="vertical"
            >
              <Form.Item
                name="email"
                rules={[{ type: 'email', required: true }]}
                style={{ marginBottom: '.5rem' }}
              >
                <Input placeholder="Email" />
              </Form.Item>
              <Button type="primary" htmlType="submit" style={{ width: '100%' }}>
                Continue with {provider.name}
              </Button>
            </Form>
          );
        }

        return (
          <Fragment key={provider.id}>
            {loginMethod}
            {idx < providers.length - 1 && provider.type !== 'oauth' && (
              <Divider style={{ color: 'black' }}>
                <Typography.Text style={{ display: 'block', textAlign: 'center', padding: '1rem' }}>
                  OR
                </Typography.Text>
              </Divider>
            )}
          </Fragment>
        );
      })}
    </>
  );
};

export default SignInOptions;
