'use client';

import { Breadcrumb, Select, Space, Tooltip, theme } from 'antd';
import { usePathname } from 'next/navigation';
import React, { FC } from 'react';
// TODO:
// Fix working import of types
// import type { RouteItemType, SeparatorType } from 'antd/lib/breadcrumb/Breadcrumb'

// type ItemType = RouteItemType | SeparatorType;

const HeaderMenu: FC = () => {
  const pathname = usePathname();
  const isProcessPage = /^\/processes\/[^/]+$/.test(pathname);
  const [process, processId] = pathname.split('/').slice(1);

  const {
    token: { fontSizeHeading1 },
  } = theme.useToken();

  const menuItems = [
    {
      key: '1',
      label: 'Test',
    },
  ];
  const itemGenerator = (item: { info: string; type: string }) => {
    return {
      title: (
        <>
          <Tooltip
            placement="rightBottom"
            title={`Select a ${item.type}`}
          >{`${item.info}`}</Tooltip>
        </>
      ),
      menu: { items: menuItems },
    };
    //   <>{
    //     <Tooltip title={`Select a ${item.type}`}>
    //       <Select
    //         defaultValue={item.type}
    //         bordered={false}
    //         size="large"
    //         options={[
    //           { label: `${item.info}`, value: 'processes' },
    //           { label: `New ${item.type}`, value: 'newProcess' },
    //         ]}
    //       />
    //     </Tooltip>
    //   </>}
  };

  const items = [process, processId].map((item) =>
    itemGenerator({ info: item, type: item === process ? 'process' : 'version' })
  );

  return (
    <>
      <Space>
        {isProcessPage && <Breadcrumb style={{ fontSize: fontSizeHeading1 }} items={items} />}
      </Space>
    </>
  );
};

export default HeaderMenu;
