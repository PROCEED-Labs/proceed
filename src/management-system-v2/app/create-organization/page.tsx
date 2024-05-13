'use client';

import Content from '@/components/content';
import { Grid } from 'antd';
import Image from 'next/image';
import OrganizationDataForm from './organization-data-form';

const CreateOrganizationPage = () => {
  const breakpoint = Grid.useBreakpoint();

  return (
    <div
      style={{
        height: '100vh',
      }}
    >
      <Content
        headerCenter={
          breakpoint.xs ? undefined : (
            <Image
              src={'/proceed.svg'}
              style={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                paddingBottom: '15px',
              }}
              alt="PROCEED Logo"
              width={breakpoint.xs ? 85 : 160}
              height={breakpoint.xs ? 35 : 63}
              priority
            />
          )
        }
      >
        <OrganizationDataForm onSubmit={console.log} />
      </Content>
    </div>
  );
};
export default CreateOrganizationPage;
