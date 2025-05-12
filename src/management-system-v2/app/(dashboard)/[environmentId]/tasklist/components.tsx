import React from 'react';

import { Button, Checkbox, Dropdown, Grid, Select, Slider } from 'antd';

import { FaFilter, FaSort } from 'react-icons/fa6';
import { ItemType } from 'antd/es/menu/interface';

import styles from './components.module.scss';
import { useState } from 'react';

export const stateOrder = ['READY', 'ACTIVE', 'COMPLETED', 'PAUSED'] as const;

export type StatusSelectionProps = {
  selectedValues: string[];
  onSelectionChange: (selectedValues: string[]) => void;
};
export const StatusSelection: React.FC<StatusSelectionProps> = ({
  selectedValues,
  onSelectionChange,
}) => (
  <Checkbox.Group
    className={styles.StatusSelection}
    value={selectedValues}
    onChange={(checkedValues: string[]) => {
      onSelectionChange(checkedValues);
    }}
  >
    {stateOrder.map((state) => (
      <Checkbox value={state} key={state}>
        {state}
      </Checkbox>
    ))}
  </Checkbox.Group>
);

export type SliderRangeWithTextProps = {
  min?: number;
  max?: number;
  selectedRangeValues?: [number, number];
  onRangeChange: (selectedRangeValues: [number, number]) => void;
};
export const SliderRangeWithText: React.FC<SliderRangeWithTextProps> = ({
  min = 0,
  max = 100,
  selectedRangeValues = [0, 100],
  onRangeChange,
}) => (
  <div className={styles.RangeSlider}>
    <Slider
      range
      value={selectedRangeValues}
      min={min}
      max={max}
      onChange={([newLowerValue, newUpperValue]) => {
        onRangeChange([newLowerValue, newUpperValue]);
      }}
    />
    <span>
      {selectedRangeValues[0]} - {selectedRangeValues[1]}
    </span>
  </div>
);

export type PerformerSelectionProps = {
  type: 'Group' | 'User';
  data: string[];
  selected: string[];
  onChange: (newSelection: string[]) => void;
};
export const PerformerSelection: React.FC<PerformerSelectionProps> = ({
  type,
  data,
  selected,
  onChange,
}) => (
  <Select
    mode="multiple"
    allowClear
    placeholder={`Select ${type}(s)`}
    maxTagCount={5}
    options={data.map((entry) => ({ label: entry, value: entry }))}
    value={selected}
    style={{ width: '100%' }}
    onChange={(_, selected) => {
      onChange((selected as { label: string; value: string }[]).map((entry) => entry.value));
    }}
  />
);

export type FilterOrSortButtonProps = {
  type: 'Filter' | 'Sort';
  items: ItemType[];
};
export const FilterOrSortButton: React.FC<FilterOrSortButtonProps> = ({ type, items }) => {
  const breakpoint = Grid.useBreakpoint();

  const [open, setOpen] = useState(false);

  return (
    <Dropdown
      open={open}
      onOpenChange={(nextOpen: boolean, info: { source: string }) => {
        if (info.source === 'trigger' || nextOpen) {
          setOpen(nextOpen);
        }
      }}
      autoFocus
      trigger={['click']}
      menu={{ items }}
      overlayStyle={{ width: type === 'Filter' ? '18rem' : undefined }}
    >
      <Button>
        <div className={styles.DropdownButton}>
          {type === 'Filter' ? <FaFilter /> : <FaSort />}
          {breakpoint.sm && <span>{type} Tasks</span>}
        </div>
      </Button>
    </Dropdown>
  );
};
