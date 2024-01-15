import React from 'react';
import { Button, Grid, Tooltip, Typography } from 'antd';
import { ReactNode } from 'react';

interface ModelerShareModalOptionProps {
  optionIcon: ReactNode;
  optionName: string;
  optionTitle: string;
  optionOnClick: () => void;
  isActive?: boolean;
}

const ModelerShareModalOption = ({
  optionIcon,
  optionName,
  optionTitle,
  optionOnClick,
  isActive,
}: ModelerShareModalOptionProps) => {
  const handleButtonClick = () => {
    optionOnClick();
  };

  const breakpoint = Grid.useBreakpoint();

  return (
    <>
      <Tooltip title={optionTitle}>
        <Button
          size="large"
          style={{
            boxShadow: isActive ? '3px 2px 2px #3D91DB' : '3px 2px 2px gray',
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
              fontSize: breakpoint.lg ? '0.75rem' : '0.6rem',
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
