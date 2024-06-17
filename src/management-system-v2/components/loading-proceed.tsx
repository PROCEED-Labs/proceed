import React, { FC, useRef } from 'react';
import Image from 'next/image';
import style from './loading-proceed.module.scss';
import { useLazyRendering } from './scrollbar';
import cn from 'classnames';

// '/proceed-icon.png'

type LoadingProps = {
  width?: number | string;
  height?: number | string;
  innerShrink?: string;
};

const ProceedLoading: FC<LoadingProps> = ({
  width = '250px',
  height /* = '155px' */,
  innerShrink = '100%',
}) => {
  const ratioedHeight =
    height || `${Number.parseInt(`${width}`) * 0.62}px`; /* Ratio of Proceed-Icon */

  const containerRef = useRef<HTMLDivElement>(null);
  const visible = useLazyRendering(containerRef, '100%');

  return (
    <div
      ref={containerRef}
      style={{
        width: width,
        height: ratioedHeight,
        // border: '1px solid black',
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: innerShrink,
          height: innerShrink,
          // border: '1px solid black',
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div className={cn(style['small-Chevron'], { [style['visible']]: visible })} />
        <div className={cn(style['big-Chevron'], { [style['visible']]: visible })} />
        {/* <Image src="/proceed-icon.png" alt="Proceed Loading" layout="fill" objectFit="contain" /> */}
        {/* For comparison */}
      </div>
    </div>
  );
};

export default ProceedLoading;
