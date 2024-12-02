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

// TODO: refine this type
// it doesn't quite reflect differences between http/mqtt
// Also, it should have an option to acknowledge user hosted
// mqtt engines.
export type Engine = { id: string } | { address: string };

// TODO: implement discovery
export async function getEngines() {
  return [{ id: '2796ebe6-237e-4e02-94a2-710030aaa654' }] as Engine[];
}
