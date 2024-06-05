import { Fragment, ReactNode } from 'react';
import { Typography, Form, Input, Button, Image as AntDesignImage, Divider } from 'antd';

import { signIn } from 'next-auth/react';
import { type ExtractedProvider } from '@/app/api/auth/[...nextauth]/auth-options';

export const SigninOptions = ({
  providers,
  callbackUrl,
}: {
  providers: ExtractedProvider[];
  callbackUrl?: string | ((providerId: ExtractedProvider['id']) => string | Promise<string>);
}) => {
  const callBackFunction = (providerId: ExtractedProvider['id']) => {
    return async (args: any) => {
      let callbackUrlString = callbackUrl;
      if (typeof callbackUrl === 'function') callbackUrlString = await callbackUrl(providerId);
      signIn(providerId, { ...args, callbackUrl: callbackUrlString });
    };
  };

  return (
    <>
      {providers.map((provider, idx) => {
        let loginMethod: ReactNode;
        if (provider.type === 'credentials') {
          loginMethod = (
            <Form onFinish={callBackFunction(provider.id)} key={provider.id} layout="vertical">
              {Object.keys(provider.credentials).map((key) => (
                <Form.Item name={key} key={key} style={{ marginBottom: '.5rem' }}>
                  <Input placeholder={provider.credentials[key].label} />
                </Form.Item>
              ))}
              <Button type="primary" htmlType="submit" style={{ width: '100%' }}>
                {provider.name}
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
              onClick={callBackFunction(provider.id)}
            >
              Continue with {provider.name}
            </Button>
          );
        } else if (provider.type === 'email') {
          loginMethod = (
            <Form onFinish={callBackFunction(provider.id)} key={provider.id} layout="vertical">
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
