'use client';

import React, { PropsWithChildren, useState } from 'react';

import styles from './resizable-window.module.scss';

type ResizableWindowProps = PropsWithChildren<{
  initialValues: {
    left?: number;
    right?: number;
    top?: number;
    bottom?: number;
  };
}>;

const ResizableWindow: React.FC<ResizableWindowProps> = ({ children, initialValues = {} }) => {
  const [values, setValues] = useState({
    left: initialValues.left,
    right: initialValues.right,
    top: initialValues.top,
    bottom: initialValues.bottom,
  });

  return (
    <div className={styles.ResizableWindow} style={{}}>
      {children}
    </div>
  );
};

export default ResizableWindow;
