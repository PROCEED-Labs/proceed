import { Card } from 'antd';
import Content from '@/components/content';
// Card throws a react children error if you don't import Title separately.
import Title from 'antd/es/typography/Title';

const Loading = () => {
  return (
    <Content title="General Management System Settings">
      <Card style={{ margin: 'auto', maxWidth: '45rem' }}>
        <Title level={3}>System Settings</Title>
      </Card>
    </Content>
  );
};

export default Loading;
