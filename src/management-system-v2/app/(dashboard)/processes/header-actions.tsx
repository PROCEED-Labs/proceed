'use client';

import Modal from '@/components/async-modal';
import { ImportOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Form, Input, Space } from 'antd';
import { FC, useState } from 'react';

type FieldType = {
  processname?: string;
  processdescription?: string;
};

const HeaderActions: FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Space>
        <Button>
          <ImportOutlined /> Import
        </Button>
        <Button
          type="primary"
          onClick={() => {
            setOpen(true);
          }}
        >
          <PlusOutlined /> Create
        </Button>
      </Space>
      {
        <Modal
          title="Create a new Process"
          open={open}
          setOpen={setOpen}
          onOk={async () => {
            console.log('OK');
          }}
          onCancel={() => {
            console.log('cancel');
          }}
        >
          <Form
            name="basic"
            labelCol={{ span: 8 }}
            wrapperCol={{ span: 16 }}
            style={{ maxWidth: 600 }}
            initialValues={{ remember: true }}
            onFinish={() => {
              console.log('finish');
            }}
            onFinishFailed={() => {
              console.log('finish failed');
            }}
            autoComplete="off"
          >
            <Form.Item<FieldType>
              label="Name"
              name="definitionName"
              rules={[{ required: true, message: 'Name your Process to PROCEED' }]}
            >
              <Input />
            </Form.Item>

            <Form.Item<FieldType>
              label="Description"
              name="description"
              rules={[{ required: false, message: 'Describe your Process' }]}
            >
              <Input />
            </Form.Item>

            {/* <Form.Item<FieldType>
              name="remember"
              valuePropName="checked"
              wrapperCol={{ offset: 8, span: 16 }}
            >
              <Checkbox>Remember me</Checkbox>
            </Form.Item> */}

            {/* <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
      <Button type="primary" htmlType="submit">
        Submit
      </Button>
    </Form.Item> */}
          </Form>
        </Modal>
      }
    </>
  );
};

export default HeaderActions;
