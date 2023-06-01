import { create } from 'zustand';
import { Processes } from './fetch-data';
import { immer } from 'zustand/middleware/immer';
import { Immutable } from 'immer';

// Define local store deviations from the API response here.
export type LocalProcess = Processes[number];

type LocalProcessStore = {
  processes: Immutable<LocalProcess[]>;
  addProcess: (process: LocalProcess) => void;
  reset: () => void;
};

const useLocalProcessStore = create<LocalProcessStore>()(
  immer((set) => ({
    processes: [],
    addProcess: (process) =>
      set((state) => {
        state.processes.push(process);
      }),
    /*removeProcess: (process) =>
      set((state) => ({
        processes: state.processes.filter((p: { id: any; }) => p.id !== process.id),
      })),
    updateProcess: (process) =>
      set((state) => ({
        processes: state.processes.map((p: { id: any; }) =>
          p.id === process.id ? process : p
        ),
      })),*/
    reset: () =>
      set((state) => {
        state.processes = [];
      }),
  }))
);

export default useLocalProcessStore;
