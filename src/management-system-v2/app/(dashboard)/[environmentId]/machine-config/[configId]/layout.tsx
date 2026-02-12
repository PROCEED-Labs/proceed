import { FC, PropsWithChildren, ReactNode } from 'react';

type MachineConfigLayoutProps = PropsWithChildren<{
  /*background: ReactNode;*/
}>;

const MachineConfigLayout: FC<MachineConfigLayoutProps> = ({ children /*, background*/ }) => {
  return (
    <>
      {/*background*/}
      {children}
    </>
  );
};

export default MachineConfigLayout;
