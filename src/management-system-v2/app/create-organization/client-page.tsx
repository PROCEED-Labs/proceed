'use client';

import Content from '@/components/content';
import { Button, Form, Grid, Input, Steps, StepsProps, Typography, message } from 'antd';
import Image from 'next/image';
import { SigninOptions } from '@/components/signin-options';
import { ExtractedProvider } from '../api/auth/[...nextauth]/auth-options';
import { Select } from 'antd';
import TextArea from 'antd/es/input/TextArea';
import useParseZodErrors, { antDesignInputProps } from '@/lib/useParseZodErrors';
import { UserOrganizationEnvironmentInputSchema } from '@/lib/data/environment-schema';
import { CountryCode, getCountries, getCountryCallingCode } from 'libphonenumber-js';
import { useState } from 'react';
import { addOrganizationEnvironment } from '@/lib/data/environments';
import { useRouter } from 'next/navigation';
import { type createNotActiveEnvironment } from './page';

const getCountryOption = (country: CountryCode) => ({
  label: (
    <span>
      <img
        // NOTE: I don't know how safe it is to use an external API to get
        // images
        src={`https://flagsapi.com/${country}/flat/64.png`}
        alt={`${country} flag`}
        width={20}
        height={20}
      />{' '}
      {`${country} +${getCountryCallingCode(country)}`}
    </span>
  ),
  value: country,
});

type CreateOrganizationPageProps = {
  needsToAuthenticate: boolean;
  providers?: ExtractedProvider[];
  createNotActiveEnvironment: createNotActiveEnvironment;
};

const CreateOrganizationPage = ({
  needsToAuthenticate,
  providers,
  createNotActiveEnvironment,
}: CreateOrganizationPageProps) => {
  const breakpoint = Grid.useBreakpoint();
  const [messageApi, contextHolder] = message.useMessage();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  const [form] = Form.useForm();
  const [formErrors, parseInput] = useParseZodErrors(UserOrganizationEnvironmentInputSchema);
  const [country, setCountry] = useState<CountryCode>('DE');
  const [isDataValid, setIsDataValid] = useState(false);
  function checkEnvironmentData(dataInput?: any) {
    dataInput = dataInput || form.getFieldsValue();
    const countryCode = getCountryCallingCode(country);
    if ('contactPhoneNumber' in dataInput)
      dataInput.contactPhoneNumber = '+' + countryCode + dataInput.contactPhoneNumber;

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

    try {
      if (!needsToAuthenticate) {
        if (!data) return;
        const response = await addOrganizationEnvironment(data);
        if ('error' in response) throw new Error();

        router.push(`/${response.id}/processes`);
      } else {
        // NOTE: the only way to get here is if the data is valid
        const response = await createNotActiveEnvironment(data!);
        if ('error' in response) throw new Error();

        return `/api/activateenvironment?activationId=${response.id}`;
      }
    } catch (e) {
      messageApi.open({
        content: 'An error occurred while creating the organization',
        type: 'error',
      });
    }
  }

  return (
    <div
      style={{
        height: '100vh',
      }}
    >
      {contextHolder}
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
                label="Contact number"
                name="contactPhoneNumber"
                {...antDesignInputProps(formErrors, 'contactPhoneNumber')}
              >
                <Input
                  addonBefore={
                    <Select
                      showSearch
                      filterOption={(input, option) =>
                        !!option?.value.toLowerCase().includes(input.toLowerCase())
                      }
                      options={getCountries().map(getCountryOption)}
                      style={{ minWidth: '8rem' }}
                      value={country}
                      onChange={setCountry}
                    />
                  }
                />
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
                    Organizations allow you to mange your processes and collaborate with your team
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
