'use client';

import { Input, InputProps, Select, SelectProps, Space } from 'antd';
import {
  CountryCode,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
} from 'libphonenumber-js';
import Image from 'next/image';
import { useState } from 'react';

const getCountryOption = (country: CountryCode) => {
  const imageUrl = ['SJ', 'AC', 'BQ', 'GF', 'IO', 'GP', 'XK'].includes(country)
    ? '_unknown'
    : country;

  return {
    label: (
      <span>
        <Image src={`/flags-32/${imageUrl}.png`} alt={`${country} flag`} width={20} height={20} />{' '}
        {`${country} +${getCountryCallingCode(country)}`}
      </span>
    ),
    value: country,
  };
};

export default function PhoneInput(
  props: {
    selectProps?: SelectProps<CountryCode, ReturnType<typeof getCountryOption>>;
  } & InputProps,
) {
  const [country, setCountry] = useState<CountryCode>(() => {
    if (!props.value || typeof props.value !== 'string') return 'DE';

    return parsePhoneNumberFromString(props.value)?.country || 'DE';
  });
  const [value, setValue] = useState(() => {
    if (!props.value || typeof props.value !== 'string') return '';

    return parsePhoneNumberFromString(props.value)?.nationalNumber || '';
  });

  return (
    <Space.Compact block>
      <Space.Addon style={{ padding: '0' }}>
        <Select<CountryCode, ReturnType<typeof getCountryOption>>
          showSearch={{
            filterOption: (input, option) =>
              !!option?.value.toLowerCase().includes(input.toLowerCase()),
          }}
          options={getCountries().map(getCountryOption)}
          style={{ minWidth: '7.5rem', padding: '5px' }}
          styles={{ content: { display: 'flex', justifyContent: 'center' } }}
          variant="borderless"
          value={country}
          onChange={(country) => {
            setCountry(country);

            const code = getCountryCallingCode(country);
            const phoneNumber = `+${code} ${value}`;
            const changeEvent = {
              target: { value: phoneNumber },
            } as React.ChangeEvent<HTMLInputElement>;
            props.onChange?.(changeEvent);
          }}
          {...props.selectProps}
        />
      </Space.Addon>
      <Input
        {...props}
        onChange={(e) => {
          const number = e.target.value;
          setValue(number);

          const code = getCountryCallingCode(country);
          e.target.value = `+${code} ${number}`;
          props.onChange?.(e);
        }}
        value={value}
      />
    </Space.Compact>
  );
}
