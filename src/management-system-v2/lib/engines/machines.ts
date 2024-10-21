// TODO: refine type
type MachineStatus = {
  discovered?: true;
  saved?: true;
  status?: 'DISCONNECTED' | 'CONNECTED';
};

export type Machine = {
  id: string;
  ip: string;
  port: number;
  hostname?: string;
  name?: string;
} & MachineStatus;

// TODO: implement discovery
export async function getMachines() {
  return [{ id: 'id', ip: 'localhost', port: 33029, status: 'CONNECTED' }] as Machine[];
}
