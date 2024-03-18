import { Row, Col, Input, InputProps, Grid } from 'antd';
import styles from './bar.module.scss';
import { ReactNode, useState } from 'react';
import { useAddControlCallback } from '@/lib/controls-store';

type BarProps = {
  leftNode?: ReactNode;
  searchProps?: InputProps;
  rightNode?: ReactNode;
};

/**
 * Bar component for a standardized search bar with custom action nodes on the
 * left and right side. The search bar fills the remaining space. On small
 * screens, the nodes are full width. All nodes are optional.
 */
const Bar = ({ leftNode, searchProps, rightNode }: BarProps) => {
  const breakpoint = Grid.useBreakpoint();
  const [inFocus, setInFocus] = useState(false);
  useAddControlCallback('process-list', ['selectall', 'del', 'copy', 'paste'], (e) => {}, {
    level: 2,
    blocking: inFocus,
  });

  return (
    <Row className={styles.Headerrow} gutter={[8, 8]} align={'middle'}>
      {leftNode && (
        <Col xs={24} xl={{ flex: '1' }}>
          {leftNode}
        </Col>
      )}
      <Col xs={23} sm={24} xl={24} /* {{ flex: 'auto' }} */>
        {searchProps && (
          <Input.Search
            allowClear
            placeholder="Search ..."
            {...searchProps}
            onFocus={() => setInFocus(true)}
            onBlur={() => setInFocus(false)}
          />
        )}
      </Col>
      {rightNode && (
        <Col xs={23} sm={24} xl={{ flex: 'none' }} style={breakpoint.xl ? {} : {}}>
          {rightNode}
        </Col>
      )}
    </Row>
  );
};

export default Bar;
