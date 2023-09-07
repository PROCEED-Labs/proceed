import { FC, useState } from 'react';
import { Space, Form, Input, Checkbox, Button, Card, Upload } from 'antd';
import { UserOutlined, LockOutlined, UploadOutlined } from '@ant-design/icons';
import { AutoComplete, Cascader, Col, InputNumber, Row, Select } from 'antd';

import cn from 'classnames';
import styles from './register.module.scss';
import { useRouter } from 'next/navigation';

const { Option } = Select;

interface DataNodeType {
  value: string;
  label: string;
  children?: DataNodeType[];
}

// const formItemLayout = {
//   labelCol: {
//     xs: { span: 24 },
//     sm: { span: 8 },
//   },
//   wrapperCol: {
//     xs: { span: 24 },
//     sm: { span: 16 },
//   },
// };

// const tailFormItemLayout = {
//   wrapperCol: {
//     xs: {
//       span: 24,
//       offset: 0,
//     },
//     sm: {
//       span: 16,
//       offset: 8,
//     },
//   },
// };

const normFile = (e: any) => {
  console.log('Upload event:', e);
  if (Array.isArray(e)) {
    return e;
  }
  return e?.fileList;
};

const Register: FC = () => {
  const router = useRouter();
  //const [form] = Form.useForm();

  /* TODO: Register */
  const onRegister = (values: any) => {
    console.log('Received values of form: ', values);
  };

  const [autoCompleteResult, setAutoCompleteResult] = useState<string[]>([]);

  return (
    <Space
      direction="horizontal"
      style={{ width: '100%', height: '100%', justifyContent: 'center' }}
    >
      <Card title="Register" className={styles.Card} /* style={{ width: '450px' }} */>
        <Form
          className={styles.registerForm}
          //   {...formItemLayout}
          // form={form}
          name="register"
          onFinish={onRegister}
          // scrollToFirstError
        >
          <Form.Item
            name="username"
            rules={[
              {
                required: true,
              },
            ]}
          >
            <Input placeholder="Username" />
          </Form.Item>

          <Form.Item
            name="firstName"
            rules={[
              {
                required: true,
              },
            ]}
          >
            <Input placeholder="First Name" />
          </Form.Item>

          <Form.Item
            name="lastName"
            rules={[
              {
                required: true,
              },
            ]}
          >
            <Input placeholder="Last Name" />
          </Form.Item>

          <Form.Item
            name="email"
            rules={[
              {
                type: 'email',
                message: 'The input is not valid E-mail!',
              },
              {
                required: true,
                message: 'Please input your E-mail!',
              },
            ]}
          >
            <Input placeholder="Email" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              {
                required: true,
                message: 'The password should be at least 8 characters long.',
              },
              (_) => ({
                validator(_, value) {
                  /* TODO: Other validations */
                  if (value.length >= 8) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error('The password should be at least 8 characters long.'),
                  );
                },
              }),
            ]}
            hasFeedback
          >
            <Input.Password placeholder="Password" />
          </Form.Item>

          <Form.Item
            name="confirm"
            dependencies={['password']}
            hasFeedback
            rules={[
              {
                required: true,
                message: 'Please confirm your password!',
              },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('The passwords do not match!'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Confirm Password" />
          </Form.Item>

          <Form.Item
            name="upload"
            valuePropName="fileList"
            getValueFromEvent={normFile}
            extra="Upload a profile picture"
          >
            <Upload name="profilePicture" action="/upload.do" listType="picture">
              <Button icon={<UploadOutlined />}>Click to upload</Button>
            </Upload>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" className={styles.registerFormButton}>
              Register
            </Button>
          </Form.Item>

          <div style={{ marginTop: '0px', marginBottom: '2px' }}>
            Or{' '}
            <a
              href=""
              onClick={() => {
                router.push('/login');
              }}
            >
              sign in here
            </a>
          </div>
        </Form>
      </Card>
    </Space>
  );
};

export default Register;
