import { FC } from 'react';
import { Space, Form, Input, Checkbox, Button, Card } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';

import cn from 'classnames';
import styles from './login.module.scss';
import { useRouter } from 'next/navigation';

const ForgotPassword: FC = () => {
  const onFinish = (values: any) => {
    console.log('Received values of form: ', values);
  };

  const router = useRouter();

  return (
    <Space
      direction="horizontal"
      style={{ width: '100%', height: '100%', justifyContent: 'center' }}
    >
      <Card title="Forgot Password" style={{ width: '350px' }}>
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

          <Form.Item>
            <Button type="primary" htmlType="submit" className={styles.loginFormButton}>
              Forgot password
            </Button>

            <div style={{ marginTop: '15px', marginBottom: '-25px' }}>
              <a
                href=""
                onClick={() => {
                  router.push('/auth/login');
                }}
              >
                Login
              </a>{' '}
              ||{' '}
              <a
                href=""
                onClick={() => {
                  router.push('/auth/register');
                }}
              >
                Register
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

export default ForgotPassword;
