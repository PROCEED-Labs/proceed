'use client';

import React, { forwardRef, use, useEffect, useImperativeHandle, useRef } from 'react';
import type ModelerType from 'bpmn-js/lib/Modeler';
import type NavigatedViewerType from 'bpmn-js/lib/NavigatedViewer';
import type ViewerType from 'bpmn-js/lib/Viewer';
import type Canvas from 'diagram-js/lib/core/Canvas';
import type ZoomScroll from 'diagram-js/lib/navigation/zoomscroll/ZoomScroll';
import type Selection from 'diagram-js/lib/features/selection/Selection';
import type ElementRegistry from 'diagram-js/lib/core/ElementRegistry';
import type Keyboard from 'diagram-js/lib/features/keyboard/Keyboard';
import type BpmnFactory from 'bpmn-js/lib/features/modeling/BpmnFactory';
import type { ElementLike } from 'diagram-js/lib/model/Types';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import schema from '@/lib/schema';
import { copyProcessImage } from '@/lib/process-export/copy-process-image';
import Modeling, { CommandStack, Shape } from 'bpmn-js/lib/features/modeling/Modeling';
import { Root, Element } from 'bpmn-js/lib/model/Types';

import {
  ResourceViewModule,
  ResourceModelingModule,
} from '@/lib/modeler-extensions/GenericResources';
import {
  CustomAnnotationViewModule,
  CustomAnnotationModelingModule,
} from '@/lib/modeler-extensions/TextAnnotation';
import { ModelingOverrideModule } from '@/lib/modeler-extensions/Overrides';

// Conditionally load the BPMN modeler only on the client, because it uses
// "window" reference. It won't be included in the initial bundle, but will be
// immediately loaded when the initial script first executes (not after
// Hydration). Note: Since we don't use the modeler on the server side, we
// exclude the null from the type.
const BPMNModeler: Promise<typeof ModelerType> =
  typeof window !== 'undefined'
    ? import('bpmn-js/lib/Modeler').then((mod) => mod.default)
    : (null as any);

const NavigatedBPMNViewer: Promise<typeof NavigatedViewerType> =
  typeof window !== 'undefined'
    ? import('bpmn-js/lib/NavigatedViewer').then((mod) => mod.default)
    : (null as any);

const BPMNViewer: Promise<typeof ViewerType> =
  typeof window !== 'undefined'
    ? import('bpmn-js/lib/Viewer').then((mod) => mod.default)
    : (null as any);

const BPMNJs = Promise.all([BPMNModeler, NavigatedBPMNViewer, BPMNViewer]);

export type BPMNCanvasProps = {
  /** The BPMN data to load.
   *
   * Note the object wrapper to force a rerender when the process changes but
   * not the BPMN.
   */
  bpmn: { bpmn: string };
  /** Wether the modeler should have editing capabilities or just be a viewer. */
  type: 'modeler' | 'navigatedviewer' | 'viewer';
  /** Called once the new BPMN has been fully loaded by the modeler. */
  onLoaded?: () => void;
  /** Called when a commandstack.change event is fired. */
  onChange?: () => void;
  /** Called when the root element changes. */
  onRootChange?: (root: Root) => void;
  /** Called before the BPMN unloads. */
  onUnload?: (oldInstance: ModelerType | NavigatedViewerType) => Promise<void>;
  /** Called when the BPMN selection changes. */
  onSelectionChange?: (oldSelection: ElementLike[], newSelection: ElementLike[]) => void;
  /** Called when the zoom level changed */
  onZoom?: (zoomLevel: number) => void;
  /** Called when a shape is removed from modeler */
  onShapeRemove?: (element: Element) => void;
  /** Called when a shape is removed and undo is done */
  onShapeRemoveUndo?: (element: Element) => void;
  /** Wether the modeler should fit the viewport if it resizes.  */
  resizeWithContainer?: boolean;
  className?: string;
};

const fitViewport = (modeler: ModelerType | NavigatedViewerType) => {
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
  getAllElements: () => ElementLike[];
  getCurrentRoot: () => Element | undefined;
  getCanvas: () => Canvas;
  getZoomScroll: () => ZoomScroll;
  getSelection: () => Selection;
  getModeling: () => Modeling;
  getFactory: () => BpmnFactory;
  loadBPMN: (bpmn: string) => Promise<void>;
  activateKeyboard: () => void;
  deactivateKeyboard: () => void;
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
      onZoom,
      onShapeRemove,
      onShapeRemoveUndo,
      resizeWithContainer,
      className,
    },
    ref,
  ) => {
    const canvas = useRef<HTMLDivElement>(null);
    const modeler = useRef<ModelerType | NavigatedViewerType | null>(null);
    const unloadPromise = useRef<Promise<void> | undefined>();

    const loadingXML = useRef(false);

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
      getAllElements: () => {
        return modeler.current!.get<ElementRegistry>('elementRegistry').getAll();
      },
      getCurrentRoot: () => {
        if (!modeler.current!.get<Canvas>('canvas').getRootElement().businessObject) {
          return;
        }

        return modeler
          .current!.get<ElementRegistry>('elementRegistry')
          .get(
            modeler.current!.get<Canvas>('canvas').getRootElement().businessObject.id,
          ) as Element;
      },
      getCanvas: () => {
        return modeler.current!.get<Canvas>('canvas');
      },
      getZoomScroll: () => {
        return modeler.current!.get<ZoomScroll>('zoomScroll');
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
        loadingXML.current = true;
        await modeler.current!.importXML(bpmn);
        loadingXML.current = false;
        fitViewport(modeler.current!);
      },
      activateKeyboard: () => {
        modeler.current!.get<Keyboard>('keyboard').bind(document);
      },
      deactivateKeyboard: () => {
        modeler.current!.get<Keyboard>('keyboard').unbind();
      },
      removeColors: () => {},
    }));

    const [Modeler, NavigatedViewer, Viewer] = use(BPMNJs);

    useEffect(() => {
      const ModelerOrViewer =
        type === 'modeler' ? Modeler : type === 'navigatedviewer' ? NavigatedViewer : Viewer;

      // this will allow any type of viewer or editor we create to render our performer elements
      const additionalModules: any[] = [ResourceViewModule, CustomAnnotationViewModule];

      // the modules related to editing can only be registered in modelers since they depend on
      // other modeler modules
      if (type === 'modeler') {
        additionalModules.push(
          ResourceModelingModule,
          CustomAnnotationModelingModule,
          ModelingOverrideModule,
        );
      }

      modeler.current = new ModelerOrViewer({
        container: canvas.current!,
        moddleExtensions: {
          proceed: schema,
        },
        additionalModules,
      });

      if (type === 'modeler') {
        // Allow keyboard shortcuts like copy (ctrl+c) and paste (ctrl+v) etc.
        modeler.current.get<Keyboard>('keyboard').bind(document);
      }

      if (type !== 'viewer') {
        // Create a custom copy behaviour where the whole process or selected parts
        // can be copied to the clipboard as an image.
        modeler.current
          .get<Keyboard>('keyboard')
          .addListener(async ({ keyEvent }: { keyEvent: KeyboardEvent }) => {
            // handle the copy shortcut
            if ((keyEvent.ctrlKey || keyEvent.metaKey) && keyEvent.key === 'c') {
              await copyProcessImage(modeler.current!);
            }
          }, 'keyboard.keyup');
      }

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
    }, [Modeler, Viewer, NavigatedViewer, type]);

    useEffect(() => {
      // Store handlers so we can remove them later.
      const _onLoaded = () => onLoaded?.();
      const commandStackChanged = () => {
        if (!loadingXML.current) onChange?.();
      };
      const selectionChanged = (event: {
        oldSelection: ElementLike[];
        newSelection: ElementLike[];
      }) => {
        onSelectionChange?.(event.oldSelection, event.newSelection);
      };
      const zoom = (zoomLevel: number) => onZoom?.(zoomLevel);

      if (type === 'modeler') {
        modeler.current!.on('commandStack.changed', commandStackChanged);

        modeler.current!.on('shape.remove', (event: { element: Element }) => {
          if (!loadingXML.current) onShapeRemove?.(event.element);
        });

        // Undo fires commandStack.revert
        modeler.current!.on(
          'commandStack.revert',
          (event: { command: string; context: { element: Element; id: string } }) => {
            if (event.command === 'id.updateClaim') {
              onShapeRemoveUndo?.(event.context.element);
            }
          },
        );

        // Redo recreates the deleted shape
        modeler.current!.on(
          'commandStack.shape.create.executed',
          (event: { context: { shape: Shape } }) => {
            if (event.context.shape.businessObject)
              onShapeRemoveUndo?.(event.context.shape.businessObject);
          },
        );
      }

      modeler.current!.on('import.done', _onLoaded);
      modeler.current!.on<{ oldSelection: ElementLike[]; newSelection: ElementLike[] }>(
        'selection.changed',
        selectionChanged,
      );
      modeler.current!.on<{
        viewbox: { x: number; y: number; width: number; height: number; scale: number };
      }>('canvas.viewbox.changed', ({ viewbox }) => {
        zoom(viewbox.scale);
      });

      return () => {
        modeler.current!.off('import.done', _onLoaded);
        modeler.current!.off('commandStack.changed', commandStackChanged);
        modeler.current!.off('selection.changed', selectionChanged);
      };
    }, [type, onLoaded, onChange, onSelectionChange, onZoom]);

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

        loadingXML.current = true;

        // Import the new bpmn.
        await m.importXML(bpmn.bpmn);

        loadingXML.current = false;

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
