'use client';

import { Tooltip, Space } from 'antd';
import { FormOutlined, PlusOutlined } from '@ant-design/icons';
import { useRouter, useSearchParams } from 'next/navigation';
import ProcessCreationButton from '@/components/process-creation-button';
import { AuthCan, useEnvironment } from '@/components/auth-can';
import ConfirmationButton from '@/components/confirmation-button';
import { copyProcesses, setVersionAsLatest } from '@/lib/data/processes';
import { spaceURL } from '@/lib/utils';

type VersionToolbarProps = { processId: string };

const VersionToolbar = ({ processId }: VersionToolbarProps) => {
  const router = useRouter();
  const query = useSearchParams();
  const environment = useEnvironment();
  // This component should only be rendered when a version is selected
  const selectedVersionId = query.get('version') as string;

  return (
    <div
      style={{
        position: 'absolute',
        zIndex: 10,
        padding: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
      }}
    >
      <Space.Compact size="large" direction="vertical">
        <AuthCan create Process>
          <Tooltip title="Create a new Process using this Version">
            <ProcessCreationButton
              icon={<PlusOutlined />}
              customAction={async (values) => {
                const result = await copyProcesses(
                  [
                    {
                      ...values,
                      originalId: processId as string,
                      originalVersion: selectedVersionId,
                    },
                  ],
                  environment.spaceId,
                );
                if (Array.isArray(result)) {
                  return result[0];
                } else {
                  // UserError was thrown by the server
                  return result;
                }
              }}
            ></ProcessCreationButton>
          </Tooltip>
        </AuthCan>
        <ConfirmationButton
          title="Are you sure you want to continue editing with this Version?"
          description="Any changes that are not stored in another version are irrecoverably lost!"
          tooltip="Set as latest Version and enable editing"
          onConfirm={async () => {
            await setVersionAsLatest(processId, Number(selectedVersionId), environment.spaceId);
            router.push(spaceURL(environment, `/processes/${processId}`));
          }}
          modalProps={{
            okText: 'Set as latest Version',
            okButtonProps: {
              danger: true,
            },
          }}
          buttonProps={{
            icon: <FormOutlined />,
          }}
        />
      </Space.Compact>
    </div>
  );
};

export default VersionToolbar;
