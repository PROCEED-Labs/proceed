'use client';

import React, { forwardRef, use, useEffect, useImperativeHandle, useRef } from 'react';
import type ModelerType from 'bpmn-js/lib/Modeler';
import type ViewerType from 'bpmn-js/lib/NavigatedViewer';
import type Canvas from 'diagram-js/lib/core/Canvas';
import Keyboard from 'diagram-js/lib/features/keyboard/Keyboard';
import type { RootLike, ElementLike } from 'diagram-js/lib/model/Types';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import schema from '@/lib/schema';
import { copyProcessImage } from '@/lib/process-export/copy-process-image';

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

type BPMNCanvasProps = {
  /** The BPMN data to load. */
  bpmn: string;
  /** Wether the modeler should have editing capabilities or just be a viewer. */
  type: 'modeler' | 'viewer';
  /** Called once the new BPMN has been fully loaded by the modeler. */
  onLoaded?: () => void;
  /** Called when a commandstack.change event is fired. */
  onChange?: () => void;
  /** Called when the root element changes. */
  onRootChange?: (root: RootLike) => void;
  /** Called before the BPMN-JS instance is destroyed. */
  onBeforeInstanceDestroy?: (oldInstance: ModelerType | ViewerType) => Promise<void>;
  /** Called when the BPMN selection changes. */
  onSelectionChange?: (oldSelection: ElementLike[], newSelection: ElementLike[]) => void;
  /** Wether the modeler should fit the viewport if it resizes.  */
  resizeWithContainer?: boolean;
  className?: string;
};

const BPMNCanvas = forwardRef(
  (
    {
      bpmn,
      type,
      onLoaded,
      onChange,
      onRootChange,
      onBeforeInstanceDestroy,
      onSelectionChange,
      resizeWithContainer,
      className,
    }: BPMNCanvasProps,
    ref,
  ) => {
    const canvas = useRef<HTMLDivElement>(null);
    const modeler = useRef<ModelerType | ViewerType | null>(null);

    // Expose explicit methods to the parent component.
    useImperativeHandle(ref, () => ({
      fitViewport: () => {
        modeler.current?.get<Canvas>('canvas').zoom('fit-viewport');
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
        modeler.current.on('commandStack.changed', () => onChange?.());
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
            await copyProcessImage(modeler.current);
          }
        }, 'keyboard.keyup');

      // Zoom new root and notify parent.
      modeler.current.on<{ element: RootLike }>('root.set', (event) => {
        modeler.current!.get<Canvas>('canvas').zoom('fit-viewport');
        onRootChange?.(event.element);
      });

      modeler.current.on<{ oldSelection: ElementLike[]; newSelection: ElementLike[] }>(
        'selection.changed',
        (event) => {
          onSelectionChange?.(event.oldSelection, event.newSelection);
        },
      );

      return () => {
        const m = modeler.current!;
        // Give the parent a chance to save before the instance is destroyed.
        (onBeforeInstanceDestroy?.(m) ?? Promise.resolve()).then(() => {
          m.destroy();
        });
      };
      // Only reset the modeler if we switch between editing being enabled or disabled
    }, [Modeler, Viewer, onBeforeInstanceDestroy, onChange, onRootChange, onSelectionChange, type]);

    useEffect(() => {
      console.log('importing');
      const m = modeler.current!;
      // Import the new bpmn.
      m.importXML(bpmn).then(() => {
        if (m !== modeler.current) {
          // The modeler was reset in the meantime.
          return;
        }
        onLoaded?.();
        modeler.current!.get<Canvas>('canvas').zoom('fit-viewport');
      });
    }, [bpmn, onLoaded, type]); // Also load if the type changed.

    // Resize the modeler to fit the container.
    useEffect(() => {
      if (!resizeWithContainer) return;

      const resizeObserver = new ResizeObserver(() => {
        modeler.current?.get<Canvas>('canvas').zoom('fit-viewport');
      });

      resizeObserver.observe(canvas.current!);
      return () => resizeObserver.disconnect();
    }, [resizeWithContainer]);

    return <div className={className} style={{ height: '100%' }} ref={canvas}></div>;
  },
);

BPMNCanvas.displayName = 'BPMNCanvas';

export default BPMNCanvas;
