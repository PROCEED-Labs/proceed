import { Form, Input } from 'antd';

export default function PasswordInputFields() {
  return (
    <>
      <Form.Item
        name="password"
        label="Password"
        rules={[{ required: true, message: 'Please input a password' }]}
        required
      >
        <Input.Password />
      </Form.Item>
      <Form.Item
        name="confirm-password"
        label="Confirm Password"
        rules={[
          { required: true, message: 'Please confirm your password' },
          ({ getFieldValue }) => ({
            validator() {
              const password = getFieldValue('password');
              const confirmPassword = getFieldValue('confirm-password');
              if (password && confirmPassword && password !== confirmPassword) {
                return Promise.reject(new Error("The passwords don't match"));
              }

              return Promise.resolve();
            },
          }),
        ]}
        required
      >
        <Input.Password />
      </Form.Item>
    </>
  );
}
