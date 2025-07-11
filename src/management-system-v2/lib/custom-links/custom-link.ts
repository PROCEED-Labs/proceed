// TODO: check type with zod
export type CustomNavigationLink = {
  name: string;
  icon: string;
  address: string;
  topic?: string;
  showStatus: boolean;
  clickable: boolean;
  position: 'top' | 'bottom';
};
