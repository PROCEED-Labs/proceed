import { useLayoutEffect, useRef, useState, ReactNode, FC } from 'react';
import { Tooltip } from 'antd';

type OverflowTooltipTitleProps = {
  children: ReactNode;
  style?: React.CSSProperties;
  title?: string | ReactNode;
};

export const OverflowTooltipTitle: FC<OverflowTooltipTitleProps> = ({ children, style, title }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [isOverflow, setIsOverflow] = useState(false);

  /* useEffect better here? */
  useLayoutEffect(() => {
    if (ref.current) {
      setIsOverflow(ref.current.scrollWidth > ref.current.clientWidth);
    }
  }, [children]);

  const content = (
    <span
      ref={ref}
      style={{
        // display: 'block',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </span>
  );

  return isOverflow ? <Tooltip title={title ? title : children}>{content}</Tooltip> : content;
};
