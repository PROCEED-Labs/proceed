import { Button, Tooltip, Typography } from 'antd';
import { ReactNode } from 'react';

interface ModelerShareModalOptionProps {
  optionIcon: ReactNode;
  optionName: string;
  optionOnClick: () => void;
}

const ModelerShareModalOption = ({
  optionIcon,
  optionName,
  optionOnClick,
}: ModelerShareModalOptionProps) => {
  return (
    <>
      <Tooltip title={optionName}>
        <Button
          size="large"
          style={{
            boxShadow: '3px 2px 2px gray',
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
          onClick={optionOnClick}
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
