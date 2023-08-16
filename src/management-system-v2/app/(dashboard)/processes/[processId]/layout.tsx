import { FC, PropsWithChildren } from 'react';

type ProcessesLayoutProps = PropsWithChildren<{
  background: React.ReactNode;
}>;

const ProcessesLayout: FC<ProcessesLayoutProps> = ({ children, background }) => {
  return (
    <>
      {background}
      {children}
    </>
  );
};

export default ProcessesLayout;
