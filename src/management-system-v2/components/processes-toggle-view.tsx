import React from 'react';
import { Button, Space } from 'antd';
import { UnorderedListOutlined, AppstoreOutlined } from '@ant-design/icons';
import { useUserPreferences } from '@/lib/user-preferences';



type ToggleViewProps = {
  iconView: Boolean
}

const ToggleView = (iconView : ToggleViewProps) => {
  const addPreferences = useUserPreferences.use.addPreferences();

return (
  <Space.Compact>
    <Button
      style={!iconView ? { color: '#3e93de', borderColor: '#3e93de' } : {}}
      onClick={() => {
      addPreferences({ 'icon-view-in-process-list': false });
      }}
      >
      <UnorderedListOutlined />
    </Button>
    <Button
      style={!iconView ? {} : { color: '#3e93de', borderColor: '#3e93de' }}
      onClick={() => {
        addPreferences({ 'icon-view-in-process-list': true });
      }}
    >
      <AppstoreOutlined />
    </Button>
  </Space.Compact>
  )
}

export default ToggleView

