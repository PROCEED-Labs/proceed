'use client';

type Unit = 'px' | 'vw' | 'vh' | 'rem' | '';

export type CssSize = `${number}${Unit}` | number;

function convertVwToPixel(valueInVw: number) {
  return (valueInVw * window.innerWidth) / 100;
}

function convertVhToPixel(valueInVh: number) {
  return (valueInVh * window.innerHeight) / 100;
}

function convertRemToPixel(valueInRem: number) {
  return valueInRem;
}

export function cssSizeToPixel(size: CssSize) {
  if (typeof size === 'number') return size;

  const unit = size.slice(-2) as Unit;
  const value = parseFloat(size);

  switch (unit) {
    case 'rem':
      return convertRemToPixel(value);
    case 'vw':
      return convertVwToPixel(value);
    case 'vh':
      return convertVhToPixel(value);
    default:
      return value;
  }
}
