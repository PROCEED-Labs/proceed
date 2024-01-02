import { FC, PropsWithChildren, ReactNode } from 'react';

type ProcessesLayoutProps = PropsWithChildren<{
  background: ReactNode;
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
