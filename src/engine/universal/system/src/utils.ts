import { v4 } from 'uuid';

export const generateUniqueTaskID = () => {
  return v4();
};
