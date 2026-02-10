'use client';

import { Button, Tooltip } from 'antd';
import { ShareAltOutlined } from '@ant-design/icons';

type ReleaseButtonProps = {
  disabled: boolean;
  onClick: () => void;
  loading?: boolean;
};

const ReleaseButton: React.FC<ReleaseButtonProps> = ({ disabled, onClick, loading }) => {
  return (
    <Tooltip title={disabled ? 'No permission to create release' : 'Create Release'}>
      <Button 
        icon={<ShareAltOutlined />} 
        disabled={disabled}
        loading={loading}
        onClick={onClick}
      >
        Release
      </Button>
    </Tooltip>
  );
};

export default ReleaseButton;
