import React from 'react';
import { Select, Space } from 'antd';
import { GlobalOutlined, DownOutlined } from '@ant-design/icons';
import { Localization, LocalizationName, languageItemsSelect } from '@/lib/data/locale';

type LanguageDropdownProps = {
  currentLanguage: Localization;
  onLanguageChange: (language: Localization) => void;
};

const LanguageDropdown = ({ currentLanguage, onLanguageChange }: LanguageDropdownProps) => {
  return (
    <Select
      showSearch={{
        optionFilterProp: 'label',
        filterOption: (input, option) =>
          (option?.label ?? '').toLowerCase().includes(input.toLowerCase()),
      }}
      value={currentLanguage}
      onChange={onLanguageChange}
      options={languageItemsSelect}
      style={{ width: 195 }}
      placeholder="Select Language"
      labelRender={(props) => (
        <Space size={8} style={{ maxWidth: '150px', overflow: 'hidden' }}>
          <GlobalOutlined style={{ color: 'black' }} />
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {LocalizationName[currentLanguage]}
          </span>
        </Space>
      )}
      suffixIcon={<DownOutlined style={{ color: 'black' }} />}
      popupMatchSelectWidth={true}
    />
  );
};

export default LanguageDropdown;
