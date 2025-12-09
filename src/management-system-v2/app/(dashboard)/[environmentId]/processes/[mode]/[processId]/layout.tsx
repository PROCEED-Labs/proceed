import { FC, ReactNode } from 'react';

type ProcessesLayoutProps = {
  children?: ReactNode;
  /*background: ReactNode;*/
};

const ProcessesLayout: FC<ProcessesLayoutProps> = ({ children /*, background*/ }) => {
  return (
    <>
      {/*background*/}
      {children}
    </>
  );
};

export default ProcessesLayout;
