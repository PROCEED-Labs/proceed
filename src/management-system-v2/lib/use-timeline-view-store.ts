import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

type TimelineViewStateStore = {
  timelineViewActive: boolean;
  toggleTimelineView: () => void;
  disableTimelineView: () => void;
};

const useTimelineViewStore = create<TimelineViewStateStore>()(
  immer((set) => ({
    timelineViewActive: false,
    toggleTimelineView: () =>
      set((state) => {
        state.timelineViewActive = !state.timelineViewActive;
      }),
    disableTimelineView: () =>
      set((state) => {
        state.timelineViewActive = false;
      }),
  })),
);

export default useTimelineViewStore;
