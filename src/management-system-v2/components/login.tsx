'use client';

import { FC } from 'react';
import { Space, Form, Input, Checkbox, Button, Card } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';

import cn from 'classnames';
import styles from './login.module.scss';
import { useRouter } from 'next/navigation';

const Login: FC = () => {
  const onFinish = (values: any) => {
    console.log('Received values of form: ', values);
  };
  const router = useRouter();

  return (
    <Space
      direction="horizontal"
      style={{ width: '100%', height: '100%', justifyContent: 'center' }}
    >
      <Card title="Login" className={styles.Card}>
        <Form
          name="normal_login"
          className={styles.loginForm}
          initialValues={{ remember: true }}
          onFinish={onFinish}
        >
          <Form.Item name="email" rules={[{ required: true, message: 'Please input your email' }]}>
            <Input
              prefix={<UserOutlined className={styles.siteFormItemIcon} />}
              placeholder="Email"
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please input your password!' }]}
          >
            <Input
              prefix={<LockOutlined className={styles.siteFormItemIcon} />}
              type="password"
              placeholder="Password"
            />
          </Form.Item>
          <Form.Item>
            <Form.Item name="remember" valuePropName="checked" noStyle>
              <Checkbox>Remember me</Checkbox>
            </Form.Item>

            <a
              className={styles.loginFormForgot}
              href=""
              onClick={() => {
                router.push('/forgotpassword');
              }}
            >
              Forgot password
            </a>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" className={styles.loginFormButton}>
              Log in
            </Button>
            <div style={{ marginTop: '14px', marginBottom: '-20px' }}>
              Or{' '}
              <a
                href=""
                onClick={() => {
                  router.push('/register');
                }}
              >
                register here
              </a>
            </div>
          </Form.Item>
        </Form>
      </Card>
    </Space>
  );

  //   return (
  //     <Space align="center" direction="vertical" size="small">
  //       <div>Test</div>

  //     </Space>
  //   );

  // <div>Test login</div>;
};

export default Login;
