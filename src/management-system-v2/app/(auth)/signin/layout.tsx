import Layout from '@/app/(dashboard)/[environmentId]/layout-client';
import Content from '@/components/content';
import Processes from '@/components/processes';
import { SetAbility } from '@/lib/abilityStore';
import { FC, PropsWithChildren } from 'react';
import { AiOutlineFile, AiOutlineProfile } from 'react-icons/ai';

const SigninLayout: FC<PropsWithChildren> = ({ children }) => {
  return (
    <>
      {children}
      <SetAbility rules={[]} environmentId={''} />
      <Layout
        activeSpace={{ spaceId: '', isOrganization: false }}
        loggedIn={true}
        userEnvironments={[{ isOrganization: false, ownerId: '', id: '' }]}
        layoutMenuItems={[
          {
            key: 'processes-group',
            label: 'Processes',
            type: 'group',
            children: [
              {
                key: 'processes',
                label: 'Process List',
                icon: <AiOutlineFile />,
              },
              {
                key: 'templates',
                label: 'Templates',
                icon: <AiOutlineProfile />,
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
                folderId: '',
                environmentId: '',
                ownerId: '',
                name: 'How to PROCEED',
                type: 'process',
                versions: [],
                createdOn: new Date(),
                lastEditedOn: new Date(),
                variables: [],
                departments: [],
                processIds: [],
                description: 'How to PROCEED',
                sharedAs: 'protected',
                shareTimestamp: 0,
                allowIframeTimestamp: 0,
              },
            ]}
            folder={{
              id: '',
              name: '',
              parentId: null,
              createdOn: new Date(),
              createdBy: '',
              lastEditedOn: new Date(),
              environmentId: '',
            }}
          />
        </Content>
      </Layout>
    </>
  );
};

export default SigninLayout;
