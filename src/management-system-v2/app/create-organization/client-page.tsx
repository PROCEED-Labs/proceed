'use client';

import Content from '@/components/content';
import { App, Button, Form, Grid, Input, Steps, StepsProps, Typography } from 'antd';
import Image from 'next/image';
import { SigninOptions } from '@/components/signin-options';
import { type ExtractedProvider } from '@/lib/auth';
import TextArea from 'antd/es/input/TextArea';
import useParseZodErrors, { antDesignInputProps } from '@/lib/useParseZodErrors';
import { UserOrganizationEnvironmentInputSchema } from '@/lib/data/environment-schema';
import { useState } from 'react';
import { addOrganizationEnvironment } from '@/lib/data/environments';
import { useRouter } from 'next/navigation';
import { type createInactiveEnvironment } from './page';
import PhoneInput from '@/components/phone-input';
import Link from 'next/link';
import { ArrowLeftOutlined } from '@ant-design/icons';

type CreateOrganizationPageProps = {
  needsToAuthenticate: boolean;
  providers?: ExtractedProvider[];
  createInactiveEnvironment: createInactiveEnvironment;
};

const CreateOrganizationPage = ({
  needsToAuthenticate,
  providers,
  createInactiveEnvironment,
}: CreateOrganizationPageProps) => {
  const breakpoint = Grid.useBreakpoint();
  const { message: messageApi } = App.useApp();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  const [form] = Form.useForm();
  const [formErrors, parseInput] = useParseZodErrors(UserOrganizationEnvironmentInputSchema);
  const [isDataValid, setIsDataValid] = useState(false);
  function checkEnvironmentData(dataInput?: any) {
    dataInput = dataInput || form.getFieldsValue();

    const data = parseInput(dataInput);
    setIsDataValid(!!data);
    return data;
  }

  const steps: StepsProps['items'] = [
    {
      title: 'Organization Data',
      onClick: () => setCurrentStep(0),
      style: { cursor: 'pointer' },
      disabled: true,
    },
    {
      title: 'Create admin account',
      disabled: !isDataValid,
      style: { cursor: isDataValid ? 'pointer' : undefined },
      onClick: () => {
        if (checkEnvironmentData()) setCurrentStep(1);
      },
    },
  ];

  async function createOrganization() {
    const data = checkEnvironmentData();
    if (!data) return;

    try {
      if (!needsToAuthenticate) {
        const response = await addOrganizationEnvironment(data);
        if ('error' in response) throw new Error();

        router.push(`/${response.id}/processes`);
      } else {
        // NOTE: the only way to get here is if the data is valid
        const response = await createInactiveEnvironment(data);
        if ('error' in response) throw new Error();

        return `/api/activateenvironment?activationId=${response.id}`;
      }
    } catch (e) {
      messageApi.open({
        content: 'An error occurred while creating the organization',
        type: 'error',
      });

      if (needsToAuthenticate) {
        // To stop the callbackUrl function so that the user isn't redirected to the signin page
        throw e;
      }
    }
  }

  return (
    <div
      style={{
        minHeight: '100svh',
        height: '1px', // hack to make children inherit correct height
      }}
    >
      <Content
        headerLeft={
          !breakpoint.xs && (
            <Button type="primary" icon={<ArrowLeftOutlined />} onClick={router.back}>
              Back
            </Button>
          )
        }
        headerCenter={
          breakpoint.xs ? undefined : (
            <Link
              style={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
              }}
              href={'/'}
            >
              <Image
                src={'/proceed.svg'}
                alt="PROCEED Logo"
                width={breakpoint.xs ? 85 : 160}
                height={breakpoint.xs ? 35 : 63}
                priority
              />
            </Link>
          )
        }
      >
        {needsToAuthenticate && (
          <Steps
            items={steps}
            current={currentStep}
            style={{ maxWidth: '50rem', margin: 'auto' }}
          />
        )}

        <div
          style={{
            paddingTop: breakpoint.xs ? '2rem' : '15vh',
          }}
        >
          <div
            style={{
              display: currentStep === 0 ? 'flex' : 'none',
              justifyContent: 'center',
              gap: '4rem',
            }}
          >
            <Form
              layout="vertical"
              style={{ width: '40ch' }}
              onFinish={() => {
                if (!needsToAuthenticate) createOrganization();
                else if (checkEnvironmentData()) setCurrentStep(1);
              }}
              form={form}
            >
              <Typography.Title level={3}>Create Organization</Typography.Title>
              <Form.Item
                label="Organization name"
                name="name"
                {...antDesignInputProps(formErrors, 'name')}
              >
                <Input />
              </Form.Item>
              <Form.Item
                label="Description"
                name="description"
                {...antDesignInputProps(formErrors, 'description')}
              >
                <TextArea />
              </Form.Item>
              <Form.Item
                label="Contact E-Mail"
                name="contactEmail"
                {...antDesignInputProps(formErrors, 'contactEmail')}
              >
                <Input />
              </Form.Item>
              <Form.Item
                label="Contact Phone Number"
                name="contactPhoneNumber"
                {...antDesignInputProps(formErrors, 'contactPhoneNumber')}
              >
                <PhoneInput />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit">
                  {needsToAuthenticate ? 'Create organization' : 'Next step'}
                </Button>
              </Form.Item>
            </Form>

            {breakpoint.lg && (
              <div>
                <div
                  style={{
                    width: '300px',
                  }}
                >
                  <Image
                    src="/bpmn-model.png"
                    alt="PROCEED Logo"
                    width={251}
                    height={128}
                    style={{
                      width: '100%',
                      height: 'auto',
                      borderRadius: '10px',
                      marginBottom: '1rem',
                      boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Typography.Title level={4} style={{ textAlign: 'center' }}>
                    Easy process modeling
                  </Typography.Title>
                  <Typography.Paragraph style={{ textAlign: 'center' }}>
                    Organizations allow you to manage your processes and collaborate with your team
                    in one place.
                  </Typography.Paragraph>
                </div>
              </div>
            )}
          </div>

          {needsToAuthenticate && (
            <div
              style={{
                display: currentStep === 1 ? 'block' : 'none',
                maxWidth: '40ch',
                margin: 'auto',
              }}
            >
              <Typography.Title level={4} style={{ textAlign: 'center', marginBottom: '2rem' }}>
                You need to sign in to create an organization
              </Typography.Title>

              <SigninOptions
                providers={providers!}
                callbackUrl={() => createOrganization() as Promise<string>}
              />
            </div>
          )}
        </div>
      </Content>
    </div>
  );
};
export default CreateOrganizationPage;
