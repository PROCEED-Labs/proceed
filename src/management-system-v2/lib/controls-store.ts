import { v4 as randomUUID } from 'uuid';
import { KeyboardEventHandler, useEffect, useState } from 'react';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

type UUID = string;

type RegisterControls = {
  area: string;
  actions: Array<string>;
};

type RegisteredControlsInterface = Record<string, (event: any) => void>;

type RegisteredCallback = {
  '1': Array<[boolean, (event: any) => void, UUID]>;
  '2': Array<[boolean, (event: any) => void, UUID]>;
  '3': Array<[boolean, (event: any) => void, UUID]>;
  '4': Array<[boolean, (event: any) => void, UUID]>;
  '5': Array<[boolean, (event: any) => void, UUID]>;
  [key: string]: Array<[boolean, (event: any) => void, UUID]>;
};

type RegisteredCallbacks = Record<string, RegisteredCallback>;

type StoreControlsInterface = Record<string, RegisteredCallbacks>;

type AddCallback = {
  id: UUID /* unique id to identify callback */;
  area: string /* Which event-emitter to listen to */;
  action: string /* Which event-type the callback should be associated with */;
  callback: (e: any) => void /* EventListener | KeyboardEventHandler */;
  priority?: 1 | 2 | 3 | 4 | 5 /* The higher the number, the earlier the callback gets invoked */;
  blocking?: boolean /* If true, the callback will block callbacks with lower priority from being invoked */;
};
type DerigisterCallback = {
  id: UUID;
};

type ControlsStore = {
  areas: Array<string>;
  controls: StoreControlsInterface;
  registerControls: (controls: RegisterControls) => void;
  addCallback: (newEntry: AddCallback) => void;
  getCallbacks: (id: string) => RegisteredCallbacks;
  removeCallback: (entry: DerigisterCallback) => void;
};

export const useControlStore = create<ControlsStore>()(
  immer((set, get) => ({
    areas: [],
    controls: {},
    registerControls: ({ area, actions }) => {
      set((state) => {
        /* If not registerd yet */
        if (!state.areas.includes(area)) {
          state.areas.push(area);
          state.controls[area] = {};
          actions.forEach((action) => {
            state.controls[area][action] = {
              '1': [],
              '2': [],
              '3': [],
              '4': [],
              '5': [],
            };
          });
        } else {
          /* If already registered, only overwrite not existing actions with default*/
          let alreadrRegisteredActions = get().controls[area];
          actions.forEach((action) => {
            if (!alreadrRegisteredActions[action]) {
              state.controls[area][action] = {
                '1': [],
                '2': [],
                '3': [],
                '4': [],
                '5': [],
              };
            }
          });
        }
      });
    },
    addCallback: ({ id, area, action, callback, priority = 1, blocking = false }) => {
      set((state) => {
        // console.log(`Adding callback to ${area} for ${action} with priority ${priority}`);
        // Check that the control-area is registered
        if (!state.areas.includes(area)) {
          console.error(`Control-area ${area} is not registered.`);
          return; /* While this should not be possible anymore, when using the provided hooks, it does not harm to leave this check */
        }

        /* Check for duplicates */
        const callbackMap = new Map();
        for (const entry of state.controls[area][action][`${priority}`]) {
          callbackMap.set(entry[1], 0);
        }
        if (!callbackMap.has(callback))
          state.controls[area][action][`${priority}`].push([blocking, callback, id]);
      });
    },
    getCallbacks: (area) => {
      return get().controls[area];
    },
    removeCallback: ({ id }) => {
      set((state) => {
        /* Filter for all: Areas, Actions and Prioritys */
        const originalControls = get().controls;

        for (const area in originalControls) {
          for (const action in originalControls[area]) {
            for (const priority in originalControls[area][action]) {
              state.controls[area][action][`${priority}`] = get().controls[area][action][
                `${priority}`
              ].filter((entry) => entry[2] !== id);
            }
          }
        }
      });
    },
  })),
);

/**
 * Register a control-area and get an interface to invoke the registered callbacks.
 *
 * @param name The name of the control-area to register.
 * @param eventnames The event-types to register.
 */
const useRegisterControls = (name: string, eventnames: Array<string>) => {
  const controlStore = useControlStore();
  controlStore.registerControls({ area: name, actions: eventnames });

  const [invokeInterface, setInvokeInterface] = useState<RegisteredControlsInterface>({});

  useEffect(() => {
    const callbacks = controlStore.getCallbacks(name);
    let newInvokeInterface = {} as RegisteredControlsInterface;
    for (const action in callbacks) {
      newInvokeInterface[action] = (e) => {
        let breaking = false;
        for (const level of ['5', '4', '3', '2', '1']) {
          for (const [blocking, callback] of callbacks[action][level]) {
            if (blocking) {
              callback(e);
              breaking = true;
              // break;
            } else {
              callback(e);
            }
          }
          if (breaking) {
            break;
          }
        }
      };
    }
    setInvokeInterface(newInvokeInterface);
  }, [controlStore.controls[name]]);

  return invokeInterface;
};

type AddControlCallbackOptions = {
  level?: 1 | 2 | 3 | 4 | 5;
  blocking?: boolean;
  dependencies?: Array<any>;
};

/**
 * Add a callback to the control store.
 * The callback will be invoked when the event is emitted.
 * The callback will be invoked in the order of priority.
 * The callback can block other callbacks with lower priority from being invoked.
 * The callback will be removed when the component is unmounted.
 * 
 * @param names The name or names of the control-area to add the callback to.
 * @param eventname The event-type(s) to listen to, can be string or list of strings for multiple.
 * @param callback The callback to invoke when the event is emitted.
 * @param options : {
    level?: 1 | 2 | 3 | 4 | 5; // The higher the number, the earlier the callback gets invoked
    blocking?: boolean; // If true, the callback will block callbacks with lower priority from being invoked
    dependencies?: Array<any>; // The dependencies to watch for changes to re-register the callback 
  }
*/
export const useAddControlCallback = (
  names: string | Array<string>,
  eventname: string | Array<string>,
  callback: (e: any) => void,
  options?: AddControlCallbackOptions,
) => {
  const { level = 1, blocking = false, dependencies = [] } = options || {};
  const controlStore = useControlStore();
  useEffect(() => {
    const nameArray = Array.isArray(names) ? names : [names];
    const eventnames = Array.isArray(eventname) ? eventname : [eventname];

    let ids: string[] = [];

    nameArray.forEach((name) => {
      /* Check whether the control is registered yet */
      if (!controlStore.areas.includes(name)) {
        /* If not, add control area with only specified (single) action */
        controlStore.registerControls({
          area: name,
          actions: eventnames,
        }); /* 
      This allows to register Callbacks to any control-area and event-type, even if they do not exist, yet.
      This means, that callbacks registered to non-existing control-areas will never be invoked!
      However, this enables an arbitrary order of registering a control-area and callbacks
      */
      }

      /* Register the callback */
      for (const e of eventnames) {
        /* Create unique id for each callback */
        const id = randomUUID();
        /* Append to overview */
        ids.push(id);
        /* Add callback to store */
        controlStore.addCallback({
          id,
          area: name,
          action: e,
          callback,
          priority: level,
          blocking,
        });
      }
    });
    /* Cleanup: Remove all added callbacks */
    return () => {
      ids.forEach((id) => {
        controlStore.removeCallback({ id });
      });
    };
  }, [level, blocking, ...dependencies]);
};

export type CheckerType = Record<string, (event: any) => boolean> /* (event: any) => boolean> */;

const defaultChecker: CheckerType = {
  selectall: (e) => (e.ctrlKey || e.metaKey) && e.key === 'a',
  del: (e) => e.key === 'Delete',
  esc: (e) => e.key === 'Escape',
  copy: (e) => (e.ctrlKey || e.metaKey) && e.key === 'c',
  paste: (e) => (e.ctrlKey || e.metaKey) && e.key === 'v',
  controlenter: (e) => (e.ctrlKey || e.metaKey) && e.key === 'Enter',
  enter: (e) => !(e.ctrlKey || e.metaKey) && e.key === 'Enter',
  cut: (e) => (e.ctrlKey || e.metaKey) && e.key === 'x',
};

type ControlEventListener<T extends Event> = (event: T) => void;

/**
 * Register a control-area with custom event-mapping.
 * 
 * @param name The name of the control-area to register.
 * @param eventChecker The event-checker, a function that determines, when a registered event for the area should be emitted. Defaults to 
 * 
 * {
 * 
  selectall: (e) => (e.ctrlKey || e.metaKey) && e.key === 'a',

  del: (e) => e.key === 'Delete',
  
  esc: (e) => e.key === 'Escape',
  
  copy: (e) => (e.ctrlKey || e.metaKey) && e.key === 'c',
  
  paste: (e) => (e.ctrlKey || e.metaKey) && e.key === 'v',
  
  controlenter: (e) => (e.ctrlKey || e.metaKey) && e.key === 'Enter',
  
  enter: (e) => !(e.ctrlKey || e.metaKey) && e.key === 'Enter',
  
  cut: (e) => (e.ctrlKey || e.metaKey) && e.key === 'x',
  
};
 * @param element The element to listen on, for initial event (React Ref), defaults to window.
 * @param eventType The event-type to listen to, defaults to "keydown" (Only generated by <input>, <textarea>, <summary> and anything with the contentEditable or tabindex attribute, however bubbles up to window / document).
 */
export const useControler = (
  name: string,
  eventChecker: CheckerType = defaultChecker,
  element?: React.RefObject<HTMLElement>,
  eventType: string = 'keydown',
) => {
  const controlInterface = useRegisterControls(name, Object.keys(eventChecker));

  useEffect(() => {
    if (element == undefined && typeof window == 'undefined') return;
    let el = element?.current ?? window;

    const eventListener: ControlEventListener<KeyboardEvent> = (e: KeyboardEvent) => {
      for (const eventname in eventChecker) {
        if (eventChecker[eventname](e)) {
          controlInterface[eventname](e);
        }
      }
    };

    // Add event listener
    el.addEventListener(eventType, eventListener as EventListener);
    // console.log(`Registered control-area ${name}`);

    // Remove event listener on cleanup
    return () => {
      el.removeEventListener(eventType, eventListener as EventListener);
      // console.log(`Removed control-area ${name}`);
    };
  }, [controlInterface, eventChecker, eventType]);
};
