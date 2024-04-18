import { Input, Select } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import React, { useEffect, useState } from 'react';
import styles from './planned-cost-input.module.scss';

import worldCurrencies from '@/lib/worldCurrencies';

type PlannedCostInputProperties = {
  costsPlanned: { value?: number; currency?: string };
  onInput: (costsPlanned: { value?: number; currency: string }) => void;
};

const PlannedCostInput: React.FC<PlannedCostInputProperties> = ({
  costsPlanned: { value, currency = 'EUR' },
  onInput,
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
        ></Select>
      }
      readOnly={!isEditing}
      placeholder="Planned Cost"
      suffix={
        isEditing ? null : (
          <EditOutlined
            onClick={() => {
              setIsEditing(true);
            }}
            data-testid="plannedCostInputEdit"
          ></EditOutlined>
        )
      }
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
          ? new Intl.NumberFormat('de-DE', {
              style: 'currency',
              currency: costsPlanned.currency,
            }).format(costsPlanned.value)
          : costsPlanned.value
      }
    />
  );
};

export default PlannedCostInput;
