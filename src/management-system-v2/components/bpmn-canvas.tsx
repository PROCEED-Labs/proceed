'use client';

import React, { forwardRef, use, useEffect, useImperativeHandle, useRef } from 'react';
import type ModelerType from 'bpmn-js/lib/Modeler';
import type ViewerType from 'bpmn-js/lib/NavigatedViewer';
import type Canvas from 'diagram-js/lib/core/Canvas';
import type Selection from 'diagram-js/lib/features/selection/Selection';
import type ElementRegistry from 'diagram-js/lib/core/ElementRegistry';
import type Keyboard from 'diagram-js/lib/features/keyboard/Keyboard';
import type BpmnFactory from 'bpmn-js/lib/features/modeling/BpmnFactory';
import type { ElementLike } from 'diagram-js/lib/model/Types';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import schema from '@/lib/schema';
import { copyProcessImage, copyProcessImage_ } from '@/lib/process-export/copy-process-image';
import Modeling, { CommandStack } from 'bpmn-js/lib/features/modeling/Modeling';
import { Root, Element } from 'bpmn-js/lib/model/Types';

// Conditionally load the BPMN modeler only on the client, because it uses
// "window" reference. It won't be included in the initial bundle, but will be
// immediately loaded when the initial script first executes (not after
// Hydration). Note: Since we don't use the modeler on the server side, we
// exclude the null from the type.
const BPMNModeler: Promise<typeof ModelerType> =
  typeof window !== 'undefined'
    ? import('bpmn-js/lib/Modeler').then((mod) => mod.default)
    : (null as any);

const BPMNViewer: Promise<typeof ViewerType> =
  typeof window !== 'undefined'
    ? import('bpmn-js/lib/NavigatedViewer').then((mod) => mod.default)
    : (null as any);

const BPMNJs = Promise.all([BPMNModeler, BPMNViewer]);

export type BPMNCanvasProps = {
  /** The BPMN data to load.
   *
   * Note the object wrapper to force a rerender when the process changes but
   * not the BPMN.
   */
  bpmn: { bpmn: string };
  /** Wether the modeler should have editing capabilities or just be a viewer. */
  type: 'modeler' | 'viewer';
  /** Called once the new BPMN has been fully loaded by the modeler. */
  onLoaded?: () => void;
  /** Called when a commandstack.change event is fired. */
  onChange?: () => void;
  /** Called when the root element changes. */
  onRootChange?: (root: Root) => void;
  /** Called before the BPMN unloads. */
  onUnload?: (oldInstance: ModelerType | ViewerType) => Promise<void>;
  /** Called when the BPMN selection changes. */
  onSelectionChange?: (oldSelection: ElementLike[], newSelection: ElementLike[]) => void;
  /** Wether the modeler should fit the viewport if it resizes.  */
  resizeWithContainer?: boolean;
  className?: string;
};

const fitViewport = (modeler: ModelerType | ViewerType) => {
  // The second argument is actually a boolean to center, but typed as a Point.
  modeler.get<Canvas>('canvas').zoom('fit-viewport', { x: 0, y: 0 });
};

export interface BPMNCanvasRef {
  fitViewport: () => void;
  getXML: () => Promise<string | undefined>;
  canUndo: () => boolean | undefined;
  canRedo: () => boolean | undefined;
  undo: () => void;
  redo: () => void;
  getElement: (id: string) => Element | undefined;
  getProcessElement: () => Element | undefined;
  getCanvas: () => Canvas;
  getSelection: () => Selection;
  getModeling: () => Modeling;
  getFactory: () => BpmnFactory;
  loadBPMN: (bpmn: string) => Promise<void>;
}

const BPMNCanvas = forwardRef<BPMNCanvasRef, BPMNCanvasProps>(
  (
    {
      bpmn,
      type,
      onLoaded,
      onChange,
      onUnload,
      onRootChange,
      onSelectionChange,
      resizeWithContainer,
      className,
    },
    ref,
  ) => {
    const canvas = useRef<HTMLDivElement>(null);
    const modeler = useRef<ModelerType | ViewerType | null>(null);
    const unloadPromise = useRef<Promise<void> | undefined>();

    // Expose explicit methods to the parent component.
    useImperativeHandle(ref, () => ({
      fitViewport: () => {
        fitViewport(modeler.current!);
      },
      getXML: async () => {
        const { xml } = await modeler.current!.saveXML({ format: true });
        return xml;
      },
      canUndo: () => {
        return modeler.current!.get<CommandStack | null>('commandStack', false)?.canUndo();
      },
      canRedo: () => {
        return modeler.current!.get<CommandStack | null>('commandStack', false)?.canRedo();
      },
      undo: () => {
        modeler.current!.get<CommandStack | null>('commandStack', false)?.undo();
      },
      redo: () => {
        modeler.current!.get<CommandStack | null>('commandStack', false)?.redo();
      },
      getElement: (id: string) => {
        return modeler.current!.get<ElementRegistry>('elementRegistry').get(id) as Element;
      },
      getProcessElement: () => {
        return modeler
          .current!.get<ElementRegistry>('elementRegistry')
          .getAll()
          .filter((el) => el.businessObject?.$type === 'bpmn:Process')[0] as Element;
      },
      getCanvas: () => {
        return modeler.current!.get<Canvas>('canvas');
      },
      getSelection: () => {
        return modeler.current!.get<Selection>('selection');
      },
      getModeling: () => {
        return modeler.current!.get<Modeling>('modeling');
      },
      getFactory: () => {
        return modeler.current!.get<BpmnFactory>('bpmnFactory');
      },
      loadBPMN: async (bpmn: string) => {
        // Note: No onUnload here, because this is only meant as a XML "change"
        // to the same process. Like a user modeling reguraly with the UI.
        await modeler.current!.importXML(bpmn);
        fitViewport(modeler.current!);
      },
    }));

    const [Modeler, Viewer] = use(BPMNJs);

    useEffect(() => {
      const ModelerOrViewer = type === 'modeler' ? Modeler : Viewer;

      modeler.current = new ModelerOrViewer({
        container: canvas.current!,
        moddleExtensions: {
          proceed: schema,
        },
      });
      console.log('modeler.current', modeler.current);

      if (type === 'modeler') {
        // Allow keyboard shortcuts like copy (ctrl+c) and paste (ctrl+v) etc.
        modeler.current.get<Keyboard>('keyboard').bind(document);
      }

      // Create a custom copy behaviour where the whole process or selected parts
      // can be copied to the clipboard as an image.
      modeler.current
        .get<Keyboard>('keyboard')
        .addListener(async ({ keyEvent }: { keyEvent: KeyboardEvent }) => {
          // handle the copy shortcut
          if (keyEvent.ctrlKey && keyEvent.key === 'c') {
            await copyProcessImage_(modeler.current!);
          }
        }, 'keyboard.keyup');

      return () => {
        const m = modeler.current!;

        // This ensures that we can await the unloadPromise before we destroy.
        // It gets set in the effect cleanup function below.
        Promise.resolve().then(async () => {
          // Give the parent a chance to save before the instance is destroyed.
          await unloadPromise.current;
          m.destroy();
        });
      };
    }, [Modeler, Viewer, type]);

    useEffect(() => {
      // Store handlers so we can remove them later.
      const _onLoaded = () => onLoaded?.();
      const commandStackChanged = () => onChange?.();
      const selectionChanged = (event: {
        oldSelection: ElementLike[];
        newSelection: ElementLike[];
      }) => {
        onSelectionChange?.(event.oldSelection, event.newSelection);
      };

      if (type === 'modeler') {
        modeler.current!.on('commandStack.changed', commandStackChanged);
      }

      modeler.current!.on('import.done', _onLoaded);
      modeler.current!.on<{ oldSelection: ElementLike[]; newSelection: ElementLike[] }>(
        'selection.changed',
        selectionChanged,
      );

      return () => {
        modeler.current!.off('import.done', _onLoaded);
        modeler.current!.off('commandStack.changed', commandStackChanged);
        modeler.current!.off('selection.changed', selectionChanged);
      };
    }, [type, onLoaded, onChange, onSelectionChange]);

    useEffect(() => {
      const m = modeler.current!;
      let loaded = false;
      const rootSet = (event: { element: Root }) => {
        fitViewport(modeler.current!);
        onRootChange?.(event.element);
      };

      async function load() {
        await unloadPromise.current;
        if (m !== modeler.current) {
          // The modeler was reset in the meantime.
          return;
        }

        console.log('importing');

        // Import the new bpmn.
        await m.importXML(bpmn.bpmn);
        if (m !== modeler.current) {
          // The modeler was reset in the meantime.
          return;
        }
        loaded = true;
        // This handler is added here because it would fire before the onLoaded
        // callback. Since we set the root for subprocesses in the onLoaded, the
        // URL check in onRootChange would fire too early.
        rootSet({ element: m.get<Canvas>('canvas').getRootElement() as Root });
        modeler.current!.on<{ element: Root }>('root.set', rootSet);
      }

      load();

      return () => {
        if (!loaded) return;

        // We store the callback so we can await it before we load the next
        // BPMN. This gives the parent a chance to save before throwing away the
        // current BPMN.
        console.log('unload');

        unloadPromise.current = onUnload?.(modeler.current!);

        modeler.current!.off('root.set', rootSet);
      };
    }, [bpmn, onRootChange, onUnload, type]); // Also load if the type changed.

    // Resize the modeler to fit the container.
    useEffect(() => {
      if (!resizeWithContainer) return;

      const resizeObserver = new ResizeObserver(() => {
        fitViewport(modeler.current!);
      });

      resizeObserver.observe(canvas.current!);
      return () => resizeObserver.disconnect();
    }, [resizeWithContainer]);

    return <div className={className} style={{ height: '100%' }} ref={canvas}></div>;
  },
);

BPMNCanvas.displayName = 'BPMNCanvas';

export default BPMNCanvas;
