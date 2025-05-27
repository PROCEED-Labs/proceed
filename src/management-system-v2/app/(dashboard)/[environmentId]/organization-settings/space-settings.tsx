'use client';

import ImageUpload from '@/components/image-upload';
import PhoneInput from '@/components/phone-input';
import {
  OrganizationEnvironment,
  UserOrganizationEnvironmentInputSchema,
} from '@/lib/data/environment-schema';
import { updateOrganization as serverUpdateOrganization } from '@/lib/data/environments';
import useParseZodErrors, { antDesignInputProps } from '@/lib/useParseZodErrors';
import { App, Button, Form, Table, Input, Image, theme, Space, Modal } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { fallbackImage } from '../processes/[processId]/image-selection-section';
import { EntityType } from '@/lib/helpers/fileManagerHelpers';
import { useFileManager } from '@/lib/useFileManager';
import { enableUseFileManager } from 'FeatureFlags';

const SpaceSettings = ({
  organization,
}: {
  organization: OrganizationEnvironment & { hasLogo: boolean };
}) => {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const router = useRouter();
  const [errors, parseInput] = useParseZodErrors(UserOrganizationEnvironmentInputSchema);
  const { colorWarning } = theme.useToken().token;

  const [updating, startUpdating] = useTransition();
  function updateOrganization(input: unknown) {
    const data = parseInput(input);
    if (!data) return;

    startUpdating(async () => {
      try {
        const result = await serverUpdateOrganization(organization.id, data);

        if ('error' in result) throw result.error.message;

        message.open({
          content: 'Organization updated',
          type: 'success',
        });
        router.refresh();
      } catch (e) {
        let content = typeof e === 'string' ? e : 'Something went wrong';

        message.open({ content, type: 'error' });
      }
    });
  }

  const { download: getLogoUrl } = useFileManager({
    entityType: EntityType.ORGANIZATION,
  });
  const logoUrl = `/api/private/${organization.id}/logo`;
  const [organizationLogo, setOrganizationLogo] = useState(
    organization.hasLogo ? logoUrl : undefined,
  );
  useEffect(() => {
    if (enableUseFileManager && organization.hasLogo) {
      getLogoUrl(organization.id, '', undefined, {
        onSuccess(data) {
          setOrganizationLogo(data.fileUrl);
        },
      });
    }
  }, [organization]);

  return (
    <Form form={form} initialValues={organization} onFinish={updateOrganization}>
      <Table
        loading={updating}
        dataSource={[
          {
            key: 'name',
            title: 'Name',
            value: (
              <Form.Item
                name="name"
                style={{ margin: '0', width: '100%' }}
                {...antDesignInputProps(errors, 'name')}
              >
                <Input />
              </Form.Item>
            ),
          },
          {
            key: 'description',
            title: 'Description',
            value: (
              <Form.Item
                name="description"
                style={{ margin: '0', width: '100%' }}
                {...antDesignInputProps(errors, 'description')}
              >
                <Input.TextArea />
              </Form.Item>
            ),
          },
          {
            key: 'contactPhoneNumber',
            title: 'Contact Phone Number',
            value: (
              <Form.Item
                name="contactPhoneNumber"
                style={{ margin: '0', width: '100%' }}
                {...antDesignInputProps(errors, 'contactPhoneNumber')}
              >
                <PhoneInput />
              </Form.Item>
            ),
          },
          {
            key: 'contactEmail',
            title: 'Contact E-Mail',
            value: (
              <Form.Item
                name="contactEmail"
                style={{ margin: '0', width: '100%' }}
                {...antDesignInputProps(errors, 'contactEmail')}
              >
                <PhoneInput />
              </Form.Item>
            ),
          },
          {
            key: 'Organization Logo',
            title: 'Organization Logo',
            value: (
              <Space>
                <Image
                  src={organizationLogo || fallbackImage}
                  fallback={fallbackImage}
                  alt={organization.name}
                  style={{
                    width: '100%',
                    maxHeight: '7.5rem',
                    borderRadius: '6px',
                    border: '1px solid #d9d9d9',
                  }}
                  preview={{
                    visible: false,
                    mask: (
                      <ImageUpload
                        imageExists={organization.hasLogo}
                        onReload={() => {
                          setOrganizationLogo(`${logoUrl}?${Date.now()}`);
                          router.refresh();
                        }}
                        onImageUpdate={(name) => {
                          const deleted = typeof name === 'undefined';
                          setOrganizationLogo(deleted ? undefined : `${logoUrl}?${Date.now}`);
                          if (deleted) message.success('Logo deleted');
                          else message.success('Logo uploaded');
                          router.refresh();
                        }}
                        onUploadFail={() => message.error('Error uploading image')}
                        endpoints={{
                          postEndpoint: logoUrl,
                          deleteEndpoint: logoUrl,
                          putEndpoint: logoUrl,
                        }}
                        config={{
                          entityType: EntityType.ORGANIZATION,
                          entityId: organization.id,
                          useDefaultRemoveFunction: true,
                          fileName: '',
                        }}
                        fileManagerErrorToasts={false}
                      />
                    ),
                  }}
                  role="group"
                  aria-label="image-section"
                />

                <Button
                  onClick={() =>
                    Modal.confirm({
                      content:
                        'Logo changes may take some time to appear everywhere. This is normal and should resolve itself shortly',
                      footer: (_, { OkBtn }) => <OkBtn />,
                      maskClosable: true,
                    })
                  }
                  style={{
                    color: colorWarning,
                  }}
                  type="text"
                >
                  <ExclamationCircleOutlined />
                </Button>
              </Space>
            ),
          },
        ]}
        columns={[
          {
            dataIndex: 'title',
            width: '20%',
            render: (title, record) => <label htmlFor={record.key}>{title}</label>,
          },
          { dataIndex: 'value', width: '50%' },
        ]}
        showHeader={false}
        pagination={false}
      />
      <div style={{ position: 'sticky', bottom: '0', marginTop: 20 }}>
        <Button type="primary" onClick={form.submit} disabled={updating}>
          Save
        </Button>
      </div>
    </Form>
  );
};

export default SpaceSettings;
