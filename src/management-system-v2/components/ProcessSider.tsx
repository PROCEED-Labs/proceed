'use client';

import { FC, PropsWithChildren } from 'react';
import { Menu } from 'antd';
const { SubMenu, Item, ItemGroup } = Menu;
import {
  EditOutlined,
  FileOutlined,
  ProfileOutlined,
  FileAddOutlined,
  StarOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { usePathname, useRouter } from 'next/navigation';
import ProcessCreationButton from './process-creation-button';
import { useAbilityStore } from '@/lib/abilityStore';
import ProcessImportButton from './process-import';

const ProcessSider: FC<PropsWithChildren> = () => {
  const router = useRouter();
  const activeSegment = usePathname().slice(1) || 'processes';
  const ability = useAbilityStore((state) => state.ability);

  return (
    <>
      <ItemGroup key="processes" title="Processes">
        {ability.can('view', 'Process') ? (
          <Item
            key="oricesses"
            title="Processes"
            icon={<FileOutlined />}
            hidden={!ability.can('view', 'Process')}
          >
            <span
              onClick={() => {
                router.push(`/processes`);
              }}
            >
              Process List
            </span>
          </Item>
        ) : // <SubMenu
        //   key="processes"
        //   title={
        //     <span
        //       onClick={() => {
        //         router.push(`/processes`);
        //       }}
        //     >
        //       Process List
        //     </span>
        //   }
        //   className={activeSegment === 'processes' ? 'SelectedSegment' : ''}
        //   icon={
        //     <EditOutlined
        //       onClick={() => {
        //         router.push(`/processes`);
        //       }}
        //     />
        //   }
        // >
        //   <Item
        //     key="newProcess"
        //     icon={<FileAddOutlined />}
        //     hidden={!ability.can('create', 'Process')}
        //   >
        //     <ProcessCreationButton
        //       wrapperElement={<span>New Process</span>}
        //     ></ProcessCreationButton>
        //   </Item>
        //   <Item
        //     key="processImport"
        //     icon={<UploadOutlined />}
        //     hidden={!ability.can('create', 'Process')}
        //   >
        //     <ProcessImportButton />
        //   </Item>
        //   <Item key="processFavorites" icon={<StarOutlined />}>
        //     Favorites
        //   </Item>
        // </SubMenu>
        null}

        {ability.can('view', 'Template') ? (
          <Item key="template" icon={<ProfileOutlined />}>
            Templates
          </Item>
        ) : // <SubMenu key="templates" title="Templates" icon={<ProfileOutlined />}>
        //   <Item
        //     key="newTemplate"
        //     icon={<FileAddOutlined />}
        //     hidden={!ability.can('create', 'Template')}
        //   >
        //     New Template
        //   </Item>
        //   <Item key="templateFavorites" icon={<StarOutlined />}>
        //     Favorites
        //   </Item>
        // </SubMenu>
        null}
      </ItemGroup>
    </>
  );
};

export default ProcessSider;
