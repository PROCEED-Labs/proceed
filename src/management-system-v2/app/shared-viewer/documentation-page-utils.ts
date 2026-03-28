import type { Editor as ToastEditorType } from '@toast-ui/editor';

import { v4 } from 'uuid';

import type ViewerType from 'bpmn-js/lib/Viewer';

import { CustomAnnotationViewModule } from '@/lib/modeler-extensions/TextAnnotation';

import Canvas, { ElementRegistry } from 'diagram-js/lib/core/Canvas';
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
  flowElementsStyling,
} from '../(dashboard)/[environmentId]/(automation)/executions/[processId]/instance-coloring';
import Overlays from 'diagram-js/lib/features/overlays/Overlays';

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

/**
 * Returns an SVG of the BPMN with instance coloring markers applied.
 * Falls back to a plain SVG if coloring cannot be applied.
 */
export async function getSVGWithInstanceColoring(
  bpmn: string,
  instance: InstanceInfo,
  coloring: ColorOptions,
): Promise<string> {
  const viewer = await getViewer(bpmn);
  const svg = await getSVGFromBPMN(viewer);
  viewer.destroy();

  if (coloring === 'noColors') return svg;

  // Build a map of elementId, color directly from instance data
  const colorMap: Record<string, string> = {};

  if (coloring === 'executionColors') {
    for (const logEntry of instance.log) {
      switch (logEntry.executionState) {
        case 'COMPLETED':
          colorMap[logEntry.flowElementId] = logEntry.executionWasInterrupted ? 'yellow' : 'green';
          break;
        case 'ERROR-SEMANTIC':
        case 'ERROR-TECHNICAL':
        case 'ERROR-CONSTRAINT-UNFULFILLED':
        case 'STOPPED':
        case 'ABORTED':
        case 'FAILED':
        case 'TERMINATED':
          colorMap[logEntry.flowElementId] = 'red';
          break;
        default:
          colorMap[logEntry.flowElementId] = 'white';
      }
    }
    // Active tokens show as green
    for (const token of instance.tokens) {
      if (!colorMap[token.currentFlowElementId]) {
        colorMap[token.currentFlowElementId] = 'green';
      }
    }
  } else if (coloring === 'timeColors') {
    for (const token of instance.tokens) {
      colorMap[token.currentFlowElementId] = 'orange'; // running = in progress
    }
    for (const logEntry of instance.log) {
      if (logEntry.executionState === 'COMPLETED') {
        colorMap[logEntry.flowElementId] = 'green';
      }
    }
  } else {
    // processColors — use execution state as fallback
    for (const logEntry of instance.log) {
      colorMap[logEntry.flowElementId] =
        logEntry.executionState === 'COMPLETED' ? 'green' : 'orange';
    }
    for (const token of instance.tokens) {
      if (!colorMap[token.currentFlowElementId]) {
        colorMap[token.currentFlowElementId] = 'orange';
      }
    }
  }

  // Apply colors inline to the SVG DOM
  console.log('colorMap:', colorMap);
  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, 'image/svg+xml');

  // test one lookup manually
  const firstId = Object.keys(colorMap)[0];
  console.log('first elementId to find:', firstId);
  console.log('found element:', doc.querySelector(`[data-element-id="${firstId}"]`));
  for (const [elementId, color] of Object.entries(colorMap)) {
    const el = doc.querySelector(`[data-element-id="${elementId}"]`);
    if (!el) continue;
    const shape = el.querySelector(
      '.djs-visual rect, .djs-visual circle, .djs-visual polygon, .djs-visual path',
    );
    if (!shape) continue;
    // Override fill inside the existing style
    const existingStyle = shape.getAttribute('style') || '';
    const updatedStyle = existingStyle
      .replace(/fill:[^;]+;?/g, '')
      .replace(/fill-opacity:[^;]+;?/g, '')
      .trimEnd();
    shape.setAttribute('style', `${updatedStyle}; fill: ${color}; fill-opacity: 0.5;`);
  }
  // Draw tokens as circles directly in the SVG (overlays are HTML, not SVG)
  for (const token of instance.tokens) {
    const el = doc.querySelector(`[data-element-id="${token.currentFlowElementId}"]`);
    if (!el) continue;

    // Get the transform to find element position
    const transform = el.getAttribute('transform') || '';
    const match = transform.match(/matrix\([^)]*\s+([\d.]+)\s+([\d.]+)\)/);
    if (!match) continue;

    const x = parseFloat(match[1]);
    const y = parseFloat(match[2]);

    // Determine token color same as instance view
    let tokenColor = 'white';
    if (instance.instanceState[0] === 'STOPPED') {
      tokenColor = 'black';
    } else {
      switch (token.state) {
        case 'RUNNING':
          tokenColor = '#52c41a';
          break;
        case 'PAUSED':
        case 'DEPLOYMENT-WAITING':
          tokenColor = '#faad14';
          break;
        case 'ERROR-SEMANTIC':
        case 'ERROR-TECHNICAL':
        case 'ERROR-INTERRUPTED':
        case 'ERROR-CONSTRAINT-UNFULFILLED':
          tokenColor = '#ff4d4f';
          break;
        case 'ABORTED':
        case 'FAILED':
        case 'TERMINATED':
          tokenColor = 'black';
          break;
        default:
          tokenColor = '#52c41a';
      }
    }

    // Create the token circle in the SVG root
    const svgRoot = doc.documentElement;
    const tokenGroup = doc.createElementNS('http://www.w3.org/2000/svg', 'g');
    tokenGroup.setAttribute('transform', `translate(${x}, ${y})`);

    const circle = doc.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '-10');
    circle.setAttribute('cy', '-10');
    circle.setAttribute('r', '10');
    circle.setAttribute('style', `fill: ${tokenColor}; stroke: black; stroke-width: 1px;`);

    const title = doc.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = token.state;

    tokenGroup.appendChild(circle);
    tokenGroup.appendChild(title);
    svgRoot.appendChild(tokenGroup);
  }
  return new XMLSerializer().serializeToString(doc.documentElement);
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
