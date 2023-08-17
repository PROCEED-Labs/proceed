'use client';
import { FC } from 'react';
import Content from './content';
import { Space, Card, Table, Avatar, TableColumnsType, Divider, Row, Col, Button } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { User, fetchUserData } from '@/lib/fetch-data';
import styles from './userProfile.module.scss';

const UserProfile: FC = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['userProfile'],
    queryFn: () => fetchUserData(),
  });

  if (isError) {
    return <div>Error</div>;
  }

  return (
    <Content title="User Profile">
      <Space direction="vertical" size="large" style={{ display: 'flex' }}>
        <Card className={styles.Card} /* style={{ width: 300 }} */>
          <Avatar size={64} src={data ? data.picture : ''} />
          <Divider />
          <Row>
            <Col lg={4} md={5} sm={7} xs={8}>
              Name
            </Col>
            <Col>{data ? `${data.firstName} ${data.lastName}` : ''}</Col>
          </Row>
          <Divider />
          <Row>
            <Col lg={4} md={5} sm={7} xs={8}>
              Username
            </Col>
            <Col>{data ? data.username : ''}</Col>
          </Row>
          <Divider />
          <Row>
            <Col lg={4} md={5} sm={7} xs={8}>
              Email
            </Col>
            <Col>{data ? data.email : ''}</Col>
          </Row>
          <Divider />
          <Space
            className={styles.Buttons} /* style={{ display: 'flex', flexDirection: 'column' }} */
          >
            <Button type="primary">Change Email</Button>
            <Button type="primary">Change Password</Button>
          </Space>
        </Card>
      </Space>
    </Content>
  );
};

export default UserProfile;
