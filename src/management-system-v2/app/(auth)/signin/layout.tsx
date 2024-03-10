import Layout from '@/app/(dashboard)/[environmentId]/layout-client';
import Content from '@/components/content';
import Processes from '@/components/processes';
import { SetAbility } from '@/lib/abilityStore';
import { FC, PropsWithChildren } from 'react';
import {
  FileOutlined,
  ProfileOutlined,
  UnlockOutlined,
  UserOutlined,
  SettingOutlined,
} from '@ant-design/icons';

const SigninLayout: FC<PropsWithChildren> = ({ children }) => {
  return (
    <>
      {children}
      <SetAbility rules={[]} environmentId={''} />
      <Layout
        loggedIn={true}
        userEnvironments={[{ organization: false, ownerId: '', id: '' }]}
        layoutMenuItems={[
          {
            key: 'processes-group',
            label: 'Processes',
            type: 'group',
            children: [
              {
                key: 'processes',
                label: 'Process List',
                icon: <FileOutlined />,
              },
              {
                key: 'templates',
                label: 'Templates',
                icon: <ProfileOutlined />,
              },
            ],
          },
          {
            key: 'divider-processes',
            type: 'divider',
          },
        ]}
      >
        <Content title="Processes">
          <Processes
            processes={[
              {
                id: '',
                environmentId: '',
                owner: '',
                name: 'How to PROCEED',
                type: 'process',
                versions: [],
                createdOn: '',
                lastEdited: '',
                variables: [],
                departments: [],
                processIds: [],
                description: 'How to PROCEED',
              },
            ]}
          />
        </Content>
      </Layout>
    </>
  );
};

export default SigninLayout;
