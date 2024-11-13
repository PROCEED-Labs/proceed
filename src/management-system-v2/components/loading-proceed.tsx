import React, { FC, useCallback, useRef, PropsWithChildren } from 'react';
import style from './loading-proceed.module.scss';
import { useLazyRendering } from './scrollbar';
import cn from 'classnames';
import { v4 as uid } from 'uuid';

// '/proceed-icon.png'

type LoadingProps = {
  width?: number | string;
  height?: number | string;
  small?: boolean;
  scale?: string;
  position?: SVGPosition;
  loading?: boolean;
};

type SVGPosition = {
  x?: number | string;
  y?: number | string;
};

const ProceedLoadingIndicator: FC<PropsWithChildren<LoadingProps>> = ({
  width = '250px',
  height /* = '155px' */,
  scale = '100%',
  small = false,
  position = { x: 0, y: 0 },
  loading = true,
  children,
}) => {
  const { x, y } = position;
  const ratioedHeight =
    height ||
    (typeof width == 'number' || (typeof width == 'string' && width.endsWith('px'))
      ? `${Number.parseInt(`${width}`) * 0.62}px`
      : `${Number.parseInt(`${width}`) * 0.62}%`); /* Ratio of Proceed-Icon */

  /* To ensure there are only visible elements are animated (margin: +- 100% ) */
  const containerRef = useRef<HTMLDivElement>(null);
  const visible = useLazyRendering(containerRef, '100%', false);

  const proceedSVG = useCallback(
    (visible: boolean) => {
      const maskID = uid();

      let shrink = parseFloat(scale);
      shrink = shrink > 1 ? (100 - shrink) / 100 : 1 - shrink;

      const size = `scale(${1.75 - 1.75 * shrink}, ${1.75 - 1.75 * shrink})`;
      // @ts-ignore
      const positioning = `translate(${-40 + x},${-3 + y})`;

      return (
        <>
          <div
            className={style.maskContainer}
            // style={{
            //   mask: `url(#${maskID}) center/80% no-repeat`,
            //   WebkitMask: `url(#${maskID}) center/80% no-repeat`,
            // }}
          >
            <div
              className={style.maskedContent}
              style={{
                mask: `url(#${maskID}) center/100% no-repeat`,
                WebkitMask: `url(#${maskID}) center/100% no-repeat`,
                // maskSize: 'contain', /* This seems not to work with grouped svgs */
                position: 'relative',
                top: y,
                left: x,
              }}
            >
              <div className={cn(style.loadingIndicatorSVG, { [style.visible]: visible })}></div>
            </div>

            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="#a6adb5"
              viewBox="0 0 121.9017 32.044838"
              preserveAspectRatio="xMidYMid meet"
              className={style.svgMask}
            >
              <defs>
                <mask
                  id={maskID}
                  x="0"
                  y="0"
                  width="200%"
                  height="100%"
                  // maskUnits="objectBoundingBox" /* This seems not to work with grouped svgs */
                >
                  {/* This is scaling the svg accordingly since masksize = cover seems not to work with grouped svgs */}
                  <g transform={size}>
                    <g transform={positioning}>
                      <g transform="scale(0.9141768,1.0938803)">
                        <path d="M 62.754603,47.019176 H 52.00563 v 9.053552 H 48.682604 V 43.69615 H 62.17816 q 1.72933,0 1.72933,-0.881619 v -3.797744 q 0,-1.017253 -1.72933,-1.017253 H 48.682604 v -3.323027 h 13.902457 q 4.645455,0 4.645455,3.594294 V 43.4927 q 0,3.492568 -4.475913,3.526476 z" />
                        <path d="M 73.993129,47.019176 V 38.94897 q 0,-1.017253 1.72933,-1.017253 H 88.200762 V 34.60869 H 75.315558 q -4.645455,0 -4.645455,3.594294 v 8.816192 z" />
                        <path d="m 96.682638,43.69615 h 8.477112 q 1.72933,0 1.72933,-0.983344 V 38.94897 q 0,-1.017253 -1.72933,-1.017253 h -8.477112 q -1.695421,0 -1.695421,1.017253 v 3.763836 q 0,0.983344 1.695421,0.983344 z m 8.884012,3.323026 h -9.257005 q -4.645455,0 -4.645455,-3.560385 v -5.255807 q 0,-3.594294 4.645455,-3.594294 h 9.257005 q 4.64545,0 4.64545,3.594294 v 5.255807 q 0,3.560385 -4.64545,3.560385 z" />
                        <path d="m 118.29714,47.019176 h 12.88521 V 43.69615 h -12.4783 q -1.72933,0 -1.72933,-0.983344 V 38.94897 q 0,-1.017253 1.72933,-1.017253 h 12.4783 V 34.60869 h -12.88521 q -4.64545,0 -4.64545,3.594294 v 5.255807 q 0,3.560385 4.64545,3.560385 z" />
                      </g>
                      <g transform="matrix(0.51663939,0,0,0.61819737,122.87891,-40.99114)">
                        <path d="m 0,144.3 h 12.95 l 5.11,-5.73 -5.11,-5.73 H 0 l 5.12,5.73 z" />
                      </g>
                      <g transform="matrix(0.51663939,0,0,0.61819737,129.39647,-37.786489)">
                        <path d="m 0,144.3 h 24.66 l 9.75,-10.91 -9.75,-10.92 H 0 l 9.75,10.92 z" />
                      </g>
                      <g
                        transform="scale(0.9141768,1.0938803)"
                        style={{ stroke: 'none', strokeOpacity: 1 }}
                      >
                        <path
                          d="m 182.02847,47.260128 v -3.323026 h -13.49555 q -1.72933,0 -1.72933,-0.983345 v -3.763836 q 0,-1.017253 1.72933,-1.017253 h 13.49555 V 25.863907 h -3.35693 v 8.985735 h -10.54552 q -4.64546,0 -4.64546,3.594294 v 5.255807 q 0,3.560385 4.64546,3.560385 z"
                          style={{ stroke: 'none', strokeOpacity: 1 }}
                        />
                      </g>
                    </g>
                  </g>
                </mask>
              </defs>
              {/* <rect x="0" y="0" width="100%" height="100%" /> */}
            </svg>
          </div>
        </>
      );
    },
    [scale, position],
  );

  return loading ? (
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
          width: scale,
          height: scale,
          // border: '1px solid black',
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {small ? (
          <>
            <div className={cn(style['small-Chevron'], { [style.visible]: visible })} />
            <div className={cn(style['big-Chevron'], { [style.visible]: visible })} />
            {/* For comparison */}
            {/* <Image src="/proceed-icon.png" alt="Proceed Loading" layout="fill" objectFit="contain" /> */}
          </>
        ) : (
          proceedSVG(visible)
        )}
      </div>
    </div>
  ) : (
    children
  );
};

export default ProceedLoadingIndicator;
