import type { Editor as ToastEditorType } from '@toast-ui/editor';

import { v4 } from 'uuid';

import type ViewerType from 'bpmn-js/lib/Viewer';

import { CustomAnnotationViewModule } from '@/lib/modeler-extensions/TextAnnotation';
import {
  getTokenColor,
  getTokenPosition,
} from '../(dashboard)/[environmentId]/(automation)/executions/[processId]/instance-tokens';
import {
  getTimeInfo,
  getPlanDelays,
} from '../(dashboard)/[environmentId]/(automation)/executions/[processId]/instance-helpers';

import Canvas from 'diagram-js/lib/core/Canvas';
import { isAny, is as isType } from 'bpmn-js/lib/util/ModelUtil';

import {
  getElementDI,
  getRootFromElement,
  getDefinitionsVersionInformation,
  getTargetDefinitionsAndProcessIdForCallActivityByObject,
  getMetaDataFromElement,
  getMilestonesFromElement,
} from '@proceed/bpmn-helper';

import { getSVGFromBPMN } from '@/lib/process-export/util';

import { InstanceInfo } from '@/lib/engines/deployment';
import schema from '@/lib/schema';

import { ResourceViewModule } from '@/lib/modeler-extensions/GenericResources/index';
import { generateNumberString } from '@/lib/utils';
import {
  ColorOptions,
  getExecutionColor,
  progressToColor,
} from '../(dashboard)/[environmentId]/(automation)/executions/[processId]/instance-coloring';

// generate the title of an elements section based on the type of the element
export function getTitle(el: any) {
  let name = el.name || `<${el.id}>`;

  if (isAny(el, ['bpmn:Collaboration', 'bpmn:Process'])) {
    return 'Process Diagram';
  } else if (isType(el, 'bpmn:Participant')) {
    return 'Pool: ' + name;
  } else if (isType(el, 'bpmn:SubProcess')) {
    return 'Subprocess: ' + name;
  } else if (isType(el, 'bpmn:CallActivity')) {
    return 'Call Activity: ' + name;
  }

  return name;
}

/**
 * Returns the meta data to show in the (sub-)chapter of an element
 *
 * @param el the moddle object representing the element
 * @param mdEditor an instance of the toast markdown editor
 */
export function getMetaDataFromBpmnElement(el: any, mdEditor: ToastEditorType) {
  const meta = getMetaDataFromElement(el);
  let image = '';

  // transform the costs information into a [value] [currency-symbol] format (e.g. {value: 123, unit: 'EUR'} => '123 €')
  if (meta.costsPlanned)
    meta.costsPlanned = generateNumberString(meta.costsPlanned.value, {
      style: 'currency',
      currency: meta.costsPlanned.unit,
    });

  if (meta.overviewImage) {
    image = meta.overviewImage;
    delete meta.overviewImage;
  }

  function getHtmlFromMarkdown(markdown: string) {
    mdEditor.setMarkdown(markdown);
    return mdEditor.getHTML();
  }

  const milestones = getMilestonesFromElement(el).map(({ id, name, description }) => {
    if (description) {
      description = getHtmlFromMarkdown(description);
    }

    return { id, name, description };
  });

  let description: string | undefined = undefined;
  const documentation = el.documentation?.find((el: any) => el.text)?.text;
  if (documentation) {
    description = getHtmlFromMarkdown(documentation);
  }

  return {
    description,
    meta: Object.keys(meta).length ? meta : undefined,
    milestones: milestones.length ? milestones : undefined,
    image,
  };
}

/**
 * Returns the elements contained by an element that should also be displayed on the documentation page
 *
 * @param el the element that possibly contains other elements
 */
export function getChildElements(el: any) {
  if (isType(el, 'bpmn:Collaboration')) {
    return el.participants || [];
  } else if (isType(el, 'bpmn:Participant')) {
    if (el.processRef.flowElements) {
      return el.processRef.flowElements.filter((el: any) => !isType(el, 'bpmn:SequenceFlow'));
    }
  } else {
    if (el.flowElements) {
      return el.flowElements.filter((el: any) => !isType(el, 'bpmn:SequenceFlow'));
    }
  }

  return [];
}

/**
 * Returns a bpmn-io viewer with the given bpmn already loaded
 *
 * @param bpmn
 */
export async function getViewer(bpmn: string) {
  const ViewerClass = (await import('bpmn-js/lib/Viewer')).default;

  //Creating temporary element for BPMN Viewer
  const viewerElement = document.createElement('div');

  //Assigning a unique id to the temp element and append to DOM
  viewerElement.id = 'canvas_' + v4();
  document.body.appendChild(viewerElement);

  //Create the viewer attached to the temporary element
  const viewer = new ViewerClass({
    container: '#' + viewerElement.id,
    moddleExtensions: {
      proceed: schema,
    },
    additionalModules: [ResourceViewModule, CustomAnnotationViewModule],
  });
  await viewer.importXML(bpmn);

  // when the viewer is destroyed remove our temporary element from the dom
  viewer.on('diagram.destroy', () => document.body.removeChild(viewerElement));

  return viewer;
}

export type ImportsInfo = {
  [definitionId: string]: {
    [versionId: string]: string;
  };
};

/**
 * Returns the svg of a specific process element and potentially the plane of an imported process or of a nested subprocess that represents the element
 *
 * @param el the element to get the svg for
 * @param bpmnViewer the viewer to get the svg from
 * @param mdEditor the markdown editor to get the description etc. for elements
 * @param definitions the definitions element that encloses the elements of the process
 * @param availableImports the imports that are available which will be used for call activities
 * @param currentRootId the id of the current root plane (process/subprocess)
 * @returns the svg and additional information needed for future transformation steps
 */
export async function getElementSVG(
  el: any,
  bpmnViewer: ViewerType,
  mdEditor: ToastEditorType,
  definitions: any,
  availableImports: ImportsInfo,
  currentRootId?: string,
) {
  let nestedSubprocess;
  let importedProcess;
  let oldBpmn;

  const elementsToShow = [el.id];
  // show incoming/outgoing sequence flows for the current element
  if (el.outgoing?.length) elementsToShow.push(el.outgoing[0].id);
  if (el.incoming?.length) elementsToShow.push(el.incoming[0].id);
  // get the representation of the element (and its incoming/outgoing sequence flows) as seen in the current plane
  let svg = await getSVGFromBPMN(bpmnViewer, currentRootId, elementsToShow);

  if (isType(el, 'bpmn:SubProcess') && !getElementDI(el, definitions).isExpanded) {
    nestedSubprocess = {
      // getting the whole layer for a collapsed sub-process
      planeSvg: await getSVGFromBPMN(bpmnViewer, el.id),
    };
    // set the new root for the following export of any children contained in this layer
    currentRootId = el.id;
  } else if (isType(el, 'bpmn:CallActivity')) {
    // check if the call activity references another process which this user can access
    let importDefinitionId: string | undefined;
    let versionId: string | undefined;
    try {
      ({ definitionId: importDefinitionId, versionId } =
        getTargetDefinitionsAndProcessIdForCallActivityByObject(getRootFromElement(el), el.id));
    } catch (err) {}

    if (
      importDefinitionId &&
      versionId &&
      availableImports[importDefinitionId] &&
      availableImports[importDefinitionId][versionId]
    ) {
      // remember the bpmn currently loaded into the viewer so we can return to it after getting the svg for the elements in the imported process
      ({ xml: oldBpmn } = await bpmnViewer.saveXML());

      // get the bpmn for the import and load it into the viewer
      const importBpmn = availableImports[importDefinitionId][versionId];

      await bpmnViewer.importXML(importBpmn);

      // set the current element and layer to the root of the imported process
      const canvas = bpmnViewer.get<Canvas>('canvas');
      const root = canvas.getRootElement();
      el = root.businessObject;
      definitions = el.$parent;
      currentRootId = undefined;

      const { name: versionName, description: versionDescription } =
        await getDefinitionsVersionInformation(definitions);

      importedProcess = {
        name: `Imported Process: ${definitions.name}`,
        ...getMetaDataFromBpmnElement(el, mdEditor),
        planeSvg: await getSVGFromBPMN(bpmnViewer),
        versionId,
        versionName,
        versionDescription,
      };
    }
  }

  return { svg, el, definitions, oldBpmn, nestedSubprocess, importedProcess, currentRootId };
}

export async function getSVGWithInstanceColoring(
  bpmn: string,
  instance: InstanceInfo,
  coloring: ColorOptions,
): Promise<string> {
  const viewer = await getViewer(bpmn);

  // Collect token positions
  const elementRegistry = viewer.get<any>('elementRegistry');
  const canvas = viewer.get<Canvas>('canvas');

  const viewerRef = {
    getElement: (id: string) => elementRegistry.get(id),
    getAllElements: () => elementRegistry.getAll(),
    getOverlays: () => viewer.get<any>('overlays'),
    getCanvas: () => canvas,
  } as any;

  const tokenPositions = instance.tokens.map((token) => ({
    token,
    color: getTokenColor(token, instance),
    position: getTokenPosition(token, viewerRef),
  }));

  const svg = await getSVGFromBPMN(viewer);
  viewer.destroy();

  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, 'image/svg+xml');
  const svgRoot = doc.documentElement;

  // Build elementId, color map
  if (coloring !== 'processColors') {
    const colorMap: Record<string, string> = {};

    for (const logEntry of instance.log) {
      const id = logEntry.flowElementId;
      const token = instance.tokens.find((t) => t.currentFlowElementId === id);

      let color: string;
      switch (coloring) {
        case 'noColors':
          color = 'white';
          break;
        case 'executionColors':
          color = getExecutionColor(logEntry.executionState, !!logEntry.executionWasInterrupted);
          break;
        case 'timeColors': {
          const timeInfo = getTimeInfo({
            element: { id, type: '', businessObject: {} } as any,
            logInfo: logEntry,
            token,
            instance,
          });
          const planInfo = getPlanDelays({ elementMetaData: {}, ...timeInfo });
          color = progressToColor(timeInfo, planInfo);
          break;
        }
        default:
          color = 'white';
      }

      colorMap[id] = color;
    }

    for (const [elementId, color] of Object.entries(colorMap)) {
      const el = doc.querySelector(`[data-element-id="${elementId}"]`);
      if (!el) continue;
      const shape = el.querySelector(
        '.djs-visual rect, .djs-visual circle, .djs-visual polygon, .djs-visual path',
      );
      if (!shape) continue;
      const cleaned = (shape.getAttribute('style') || '')
        .replace(/fill:[^;]+;?/g, '')
        .replace(/fill-opacity:[^;]+;?/g, '')
        .trimEnd();
      shape.setAttribute('style', `${cleaned}; fill: ${color}; fill-opacity: 0.5;`);
    }
  }

  // Draw tokens using positions
  for (const { token, color, position } of tokenPositions) {
    const targetEl = doc.querySelector(`[data-element-id="${position.targetElementId}"]`);
    if (!targetEl) continue;

    let cx: number;
    let cy: number;

    const isConnection = targetEl.classList.contains('djs-connection');

    if (isConnection) {
      // Sequence flows have no transform; coordinates are absolute in path d attribute
      const path = targetEl.querySelector('.djs-visual path');
      const d = path?.getAttribute('d') || '';
      const pointMatches = [...d.matchAll(/[ML]([\d.]+),([\d.]+)/g)];
      if (pointMatches.length < 2) continue;

      const last = pointMatches[pointMatches.length - 1];
      const secondLast = pointMatches[pointMatches.length - 2];
      const lx = parseFloat(last[1]);
      const ly = parseFloat(last[2]);
      const slx = parseFloat(secondLast[1]);
      const sly = parseFloat(secondLast[2]);

      // Use top/right from getTokenPosition as offsets from the last waypoint
      cx = lx - (position.right || 0) + 10;
      cy = ly + (position.top || 0) + 10;
    } else {
      // Shape elements have matrix transform
      const transform = targetEl.getAttribute('transform') || '';
      const match =
        transform.match(/matrix\([\d\s.]+\s+([\d.]+)\s+([\d.]+)\)/) ||
        transform.match(/translate\(([\d.]+)[, ]+([\d.]+)\)/);
      if (!match) continue;

      const elX = parseFloat(match[1]);
      const elY = parseFloat(match[2]);
      const shape = targetEl.querySelector('.djs-visual rect, .djs-visual circle');
      const elWidth = shape ? parseFloat(shape.getAttribute('width') || '0') : 0;

      cx =
        position.right !== undefined ? elX + elWidth - position.right : elX + (position.left || 0);
      cy = elY + (position.top || 0);
    }

    const tokenGroup = doc.createElementNS('http://www.w3.org/2000/svg', 'g');

    const circle = doc.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', String(cx));
    circle.setAttribute('cy', String(cy));
    circle.setAttribute('r', '10');
    circle.setAttribute('style', `fill: ${color}; stroke: black; stroke-width: 1;`);

    const title = doc.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = token.state;

    tokenGroup.appendChild(circle);
    tokenGroup.appendChild(title);
    svgRoot.appendChild(tokenGroup);
  }

  return new XMLSerializer().serializeToString(svgRoot);
}

export const markdownEditor: Promise<ToastEditorType> =
  typeof window !== 'undefined'
    ? import('@toast-ui/editor')
        .then((mod) => mod.Editor)
        .then((Editor) => {
          const div = document.createElement('div');
          return new Editor({ el: div });
        })
    : (Promise.resolve(null) as any);
