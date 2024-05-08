import { z } from 'zod';

export type MachineConfig = {
  id: string;
  environmentId: string;
  name: string;
};
