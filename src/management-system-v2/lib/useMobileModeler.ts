import { Grid } from 'antd';

export default function useMobileModeler() {
  const breakpoint = Grid.useBreakpoint();

  return breakpoint.xs;
}
