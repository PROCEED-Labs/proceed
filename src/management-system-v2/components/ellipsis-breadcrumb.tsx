import { FC } from 'react';

import { Breadcrumb, BreadcrumbProps } from 'antd';

type EllipsisBreadcrumbProps = BreadcrumbProps & {
  keepInFront?: number; // the number of elements before the ellipsis
  keepInBack?: number; // the number of elements after the ellipsis
};

const EllipsisBreadcrumb: FC<EllipsisBreadcrumbProps> = ({
  items = [],
  keepInFront = 3,
  keepInBack = 2,
  ...props
}) => {
  const frontItems = items.slice(0, keepInFront);
  const ellipsedItems = items.slice(keepInFront, -keepInBack);
  const backItems = items.slice(keepInFront + ellipsedItems.length);

  const breadcrumbItems = frontItems.concat(
    ellipsedItems.length
      ? [
          {
            title: '...',
            menu: {
              items: ellipsedItems.map((item) => ({ label: item.title, onClick: item.onClick })),
            },
          },
        ]
      : [],
    backItems,
  );

  return <Breadcrumb items={breadcrumbItems} {...props}></Breadcrumb>;
};

export default EllipsisBreadcrumb;
