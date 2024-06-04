import React, { FC } from 'react';
import Image from 'next/image';
import style from './loading-proceed.module.scss';

// '/proceed-icon.png'

type LoadingProps = {
  width?: number | string;
  height?: number | string;
};

const ProceedLoading: FC<LoadingProps> = ({ width = '250px', height /* = '155px' */ }) => {
  height = height || `${Number.parseInt(`${width}`) * 0.62}px`; /* Ratio of Proceed-Icon */
  return (
    <div
      style={{
        width: width,
        height: height,
        // border: '1px solid black',
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div className={style['small-Chevron']} />
      <div className={style['big-Chevron']} />
      {/* <Image src="/proceed-icon.png" alt="Proceed Loading" layout="fill" objectFit="contain" /> */}
      {/* For comparison */}
    </div>
  );
};

export default ProceedLoading;
