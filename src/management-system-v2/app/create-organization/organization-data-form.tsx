import { Select } from 'antd';
import { Form, Grid, Input, Typography, Button } from 'antd';
import Image from 'next/image';
import TextArea from 'antd/es/input/TextArea';
import useParseZodErrors, { antDesignInputProps } from '@/lib/useParseZodErrors';
import {
  UserOrganizationEnvironmentInput,
  UserOrganizationEnvironmentInputSchema,
} from '@/lib/data/environment-schema';
import { CountryCode, getCountries, getCountryCallingCode } from 'libphonenumber-js';
import { useState } from 'react';

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

const OrganizationDataForm = ({
  onSubmit,
}: {
  onSubmit: (values: UserOrganizationEnvironmentInput) => void;
}) => {
  const breakpoint = Grid.useBreakpoint();
  const [formErrors, parseInput] = useParseZodErrors(UserOrganizationEnvironmentInputSchema);
  const [country, setCountry] = useState<CountryCode>('DE');
  function submitEnvironmentData(dataInput: any) {
    const countryCode = getCountryCallingCode(country);
    if ('contactPhoneNumber' in dataInput)
      dataInput.contactPhoneNumber = '+' + countryCode + dataInput.contactPhoneNumber;

    const data = parseInput(dataInput);
    if (!data) return;
    onSubmit(data);
  }
  return (
    <div
      style={{
        paddingTop: breakpoint.xs ? '2rem' : '10vh',
      }}
    >
      <div
        style={{
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '4rem',
        }}
      >
        <Form layout="vertical" style={{ width: '40ch' }} onFinish={submitEnvironmentData}>
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
          <Form.Item label=" ">
            <Button type="primary" htmlType="submit">
              Next step
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
                Organizations allow you to mange your processes and collaborate with your team in
                one place.
              </Typography.Paragraph>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizationDataForm;
