'use client';

import { Input, InputProps, Select, SelectProps } from 'antd';
import {
  CountryCode,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
} from 'libphonenumber-js';
import Image from 'next/image';
import { useEffect, useState } from 'react';

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

  useEffect(() => {
    if (props.onChange) {
      const code = getCountryCallingCode(country);
      const phoneNumber = `+${code} ${value}`;
      const changeEvent = {
        target: { value: phoneNumber },
      } as React.ChangeEvent<HTMLInputElement>;

      props.onChange(changeEvent);
    }
  }, [country, props.onChange]);

  return (
    <Input
      {...props}
      addonBefore={
        <Select<CountryCode, ReturnType<typeof getCountryOption>>
          showSearch
          options={getCountries().map(getCountryOption)}
          filterOption={(input, option) =>
            !!option?.value.toLowerCase().includes(input.toLowerCase())
          }
          style={{ minWidth: '8rem' }}
          value={country}
          onChange={setCountry}
          {...props.selectProps}
        />
      }
      onChange={(e) => {
        const code = getCountryCallingCode(country);
        const number = e.target.value;
        setValue(number);
        e.target.value = `+${code} ${number}`;
        props.onChange?.(e);
      }}
      value={value}
    />
  );
}
