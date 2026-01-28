import { Input, Select } from 'antd';
import React, { useEffect, useState } from 'react';
import styles from './planned-cost-input.module.scss';

import worldCurrencies from '@/lib/worldCurrencies';
import { generateNumberString } from '@/lib/utils';

type PlannedCostInputProperties = {
  costsPlanned: { value?: number; currency?: string };
  onInput: (costsPlanned: { value?: number; currency: string }) => void;
  readOnly?: boolean;
};

const PlannedCostInput: React.FC<PlannedCostInputProperties> = ({
  costsPlanned: { value, currency = 'EUR' },
  onInput,
  readOnly = false,
}) => {
  const [costsPlanned, setCostsPlanned] = useState<{ value?: number; currency: string }>({
    value,
    currency: currency,
  });

  useEffect(() => {
    setCostsPlanned({ value: value, currency: currency });
  }, [value, currency]);

  const currencyOptions = worldCurrencies.map((currency) => ({
    value: currency.cc,
    label: `${currency.cc} - ${currency.symbol}`,
  }));

  const [isEditing, setIsEditing] = useState(false);
  return (
    <Input
      type={!isEditing ? 'text' : 'number'}
      className={styles.PlannedCostInput}
      style={{ width: '100%' }}
      addonBefore={
        <Select
          suffixIcon={null}
          value={costsPlanned.currency}
          options={currencyOptions}
          optionLabelProp="value"
          onChange={(value) => {
            setCostsPlanned({ value: costsPlanned.value, currency: value });
            if (costsPlanned.value) {
              onInput({ value: costsPlanned.value, currency: value });
            }
          }}
          dropdownStyle={{ width: '7rem' }}
          disabled={readOnly}
        ></Select>
      }
      placeholder="Planned Cost"
      onFocus={() => setIsEditing(true)}
      onChange={(val) => {
        setCostsPlanned({
          value: parseInt(val.target.value) || undefined,
          currency: costsPlanned.currency,
        });
      }}
      onBlur={() => {
        setIsEditing(false);
        onInput(costsPlanned);
      }}
      value={
        !isEditing && costsPlanned.value
          ? generateNumberString(costsPlanned.value, {
              style: 'currency',
              currency: costsPlanned.currency,
            })
          : costsPlanned.value
      }
      disabled={readOnly}
    />
  );
};

export default PlannedCostInput;
