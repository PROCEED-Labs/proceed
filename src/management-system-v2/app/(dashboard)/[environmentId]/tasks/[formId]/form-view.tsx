'use client';

import Content from '@/components/content';
import { HtmlForm } from '@prisma/client';
import { Space, Typography } from 'antd';

type FormViewProps = {
  data: HtmlForm;
};

const FormView: React.FC<FormViewProps> = ({ data }) => {
  return (
    <Content
      headerLeft={
        <Typography.Text strong style={{ padding: '0 5px' }}>
          Form
        </Typography.Text>
      }
      headerCenter={
        <Typography.Text strong style={{ padding: '0 5px' }}>
          {data.name}
        </Typography.Text>
      }
    >
      <Space direction="vertical" size="large" style={{ display: 'flex', height: '100%' }}>
        <div style={{ color: 'red' }}>{data.html}</div>
        <div style={{ color: 'blue' }}>{data.json}</div>
      </Space>
    </Content>
  );
};

export default FormView;
