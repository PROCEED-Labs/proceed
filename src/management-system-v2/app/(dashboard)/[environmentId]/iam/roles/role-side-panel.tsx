'use client';

import { Dispatch, FC, PropsWithChildren, SetStateAction, useRef } from 'react';
import { Alert, Drawer, Grid, Typography } from 'antd';
import CollapsibleCard from '@/components/collapsible-card';
import { useUserPreferences } from '@/lib/user-preferences';
import ResizableElement, { ResizableElementRefType } from '@/components/ResizableElement';
import { FilteredRole } from './role-page';
import RoleSiderContent from './role-sider-content';

type RoleSidePanelProps = PropsWithChildren<{
  role: FilteredRole | null;
  setShowMobileRoleSider: Dispatch<SetStateAction<boolean>>;
  showMobileRoleSider: boolean;
}>;

const RoleSidePanel: FC<RoleSidePanelProps> = ({
  role,
  setShowMobileRoleSider,
  showMobileRoleSider,
}) => {
  const setUserPreferences = useUserPreferences.use.addPreferences();
  const sidePanelOpen = useUserPreferences(
    (store) => store.preferences['role-page-side-panel'].open,
  );
  const breakpoint = Grid.useBreakpoint();
  const hydrated = useUserPreferences.use._hydrated();

  const resizableElementRef = useRef<ResizableElementRefType>(null);

  const closeMobileRoleSider = () => {
    setShowMobileRoleSider(false);
  };

  if (!hydrated) return null;
  return breakpoint.xl ? (
    <ResizableElement
      initialWidth={
        sidePanelOpen ? useUserPreferences.getState().preferences['role-page-side-panel'].width : 30
      }
      minWidth={300}
      maxWidth={600}
      style={{ position: 'relative', marginLeft: '20px' }}
      onWidthChange={(width) =>
        setUserPreferences({
          'role-page-side-panel': {
            open: sidePanelOpen,
            width: width,
          },
        })
      }
      ref={resizableElementRef}
    >
      <CollapsibleCard
        title={role?.name.value ?? 'How to PROCEED?'}
        show={sidePanelOpen}
        collapsedWidth="30px"
        onCollapse={() => {
          const resizeCard = resizableElementRef.current;
          const sidepanelWidth =
            useUserPreferences.getState().preferences['role-page-side-panel'].width;

          if (resizeCard) {
            if (sidePanelOpen) resizeCard(30);
            else resizeCard(sidepanelWidth);
          }
          setUserPreferences({
            'role-page-side-panel': {
              open: !sidePanelOpen,
              width: sidepanelWidth,
            },
          });
        }}
      >
        <RoleSiderContent role={role} />
      </CollapsibleCard>
    </ResizableElement>
  ) : (
    <Drawer
      onClose={closeMobileRoleSider}
      title={role ? role.name.value : ''}
      open={showMobileRoleSider}
    >
      <RoleSiderContent role={role} />
    </Drawer>
  );
};

export default RoleSidePanel;
