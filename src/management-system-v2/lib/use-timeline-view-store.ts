import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

type TimelineViewStateStore = {
  timelineViewActive: boolean;
  enableTimelineView: () => void;
  disableTimelineView: () => void;
};

const useTimelineViewStore = create<TimelineViewStateStore>()(
  immer((set) => ({
    timelineViewActive: false,
    enableTimelineView: () =>
      set((state) => {
        state.timelineViewActive = true;
      }),
    disableTimelineView: () =>
      set((state) => {
        state.timelineViewActive = false;
      }),
  })),
);

export default useTimelineViewStore;
