import { useState } from 'react';
import { Button, Tooltip, Typography } from 'antd';
import { ReactNode } from 'react';

interface ModelerShareModalOptionProps {
  optionIcon: ReactNode;
  optionName: string;
  optionOnClick: () => void;
  isActive: boolean;
}

const ModelerShareModalOption = ({
  optionIcon,
  optionName,
  optionOnClick,
  isActive,
}: ModelerShareModalOptionProps) => {
  const handleButtonClick = () => {
    if (!isActive) {
      optionOnClick();
    }
  };

  return (
    <>
      <Tooltip title={optionName}>
        <Button
          size="large"
          style={{
            boxShadow: isActive ? '2px 2px 2px #3D91DB' : '3px 2px 2px gray',
            border: '1px solid black',
            width: '124px',
            height: '90px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
            whiteSpace: 'normal',
            textOverflow: 'ellipsis',
          }}
          onClick={handleButtonClick}
        >
          {optionIcon}
          <Typography.Text
            style={{
              textAlign: 'center',
              fontSize: '0.75rem',
            }}
          >
            {optionName}
          </Typography.Text>
        </Button>
      </Tooltip>
    </>
  );
};

export default ModelerShareModalOption;
