import { Menu, Typography } from 'antd';

export const InstanceSelector = () => {
  return (
    <>
      <Typography.Title style={{ marginBottom: 20, marginTop: 5 }}>
        Please Select an instance.
      </Typography.Title>
      <Menu />
    </>
  );
};
