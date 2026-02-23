import React, { useEffect, useState } from 'react';
import { Select, Spin } from 'antd';
import {
  GlobalVariableGroup,
  parseGlobalVariables,
  buildValueMap,
} from '@/lib/helpers/global-data-objects';

import { getDeepConfigurationById } from '@/lib/data/db/machine-config';

type Props = {
  onChange: (path: string) => void;
  disabled?: boolean;
  style?: React.CSSProperties;
};

// export so ToolbarPlugin and text rendering can reuse it
export let cachedValueMap: Record<string, string> = {};

const GlobalVariablePicker: React.FC<Props> = ({ onChange, disabled, style }) => {
  const [options, setOptions] = useState<{ label: string; value: string; title: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectKey, setSelectKey] = useState(0); // ADD: key to force remount

  useEffect(() => {
    setLoading(true);
    getDeepConfigurationById('55c0241f-fef0-4206-b0de-18a59275831d')
      .then((config) => {
        const groups = parseGlobalVariables(config);
        cachedValueMap = buildValueMap(config);
        const flat = groups.flatMap((group) =>
          group.variables.map((v) => ({
            label: `{%${v.path}%}`,
            value: v.path,
            title: v.path,
          })),
        );
        setOptions(flat);
      })
      .catch(() => setOptions([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Select
      key={selectKey} // ADD: changing key forces full remount = guaranteed reset
      style={{ display: 'flex', ...style }}
      value={undefined}
      disabled={disabled}
      loading={loading}
      notFoundContent={loading ? <Spin size="small" /> : 'No global variables found'}
      options={loading ? [] : options}
      onChange={(path) => {
        if (!path) return; // ADD: guard against undefined
        onChange(path);
        setSelectKey((k) => k + 1);
      }}
      placeholder="Insert global variable..."
      popupMatchSelectWidth={false}
    />
  );
};

export default GlobalVariablePicker;
//////////