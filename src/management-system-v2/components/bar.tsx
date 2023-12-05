import { Row, Col, Input, InputProps } from 'antd';
import styles from './bar.module.scss';
import { ReactNode } from 'react';

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
  return (
    <Row className={styles.Headerrow} gutter={[8, 8]} align={'middle'}>
      {leftNode && (
        <Col xs={24} lg={{ flex: 'none' }} className={styles.SelectedRow}>
          {leftNode}
        </Col>
      )}
      <Col xs={24} lg={{ flex: 'auto' }}>
        {searchProps && <Input.Search allowClear placeholder="Search ..." {...searchProps} />}
      </Col>
      {rightNode && (
        <Col xs={24} lg={{ flex: 'none' }}>
          {rightNode}
        </Col>
      )}
    </Row>
  );
};

export default Bar;
