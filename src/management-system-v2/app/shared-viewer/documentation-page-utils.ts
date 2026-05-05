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
import { ElementInfo } from './table-of-content';
import { AnchorLinkItemProps } from 'antd/es/anchor/Anchor';
import { BPMNCanvasRef } from '@/components/bpmn-canvas';

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
  // find boundary events attached to this element from parent's flowElements so that it can be shown attached to element
  const parentFlowElements = el.$parent?.flowElements ?? [];
  const attachedBoundaryEvents = parentFlowElements.filter(
    (fe: any) => fe.$type === 'bpmn:BoundaryEvent' && fe.attachedToRef?.id === el.id,
  );
  for (const be of attachedBoundaryEvents) {
    elementsToShow.push(be.id);
    if (be.outgoing?.length) elementsToShow.push(be.outgoing[0].id);
  }
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

// returns the svg of BPMN diagram for instance documention page with correcct token position
export async function getSVGWithInstanceColoring(
  bpmn: string,
  instance: InstanceInfo,
  coloring: ColorOptions,
): Promise<string> {
  const viewer = await getViewer(bpmn);

  // Collect token positions
  const elementRegistry = viewer.get<any>('elementRegistry');

  const viewerRef = {
    getElement: (id: string) => elementRegistry.get(id),
  };

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

// get element <Type: Name> or <Type: ID> label
export function getElementTypeLabel(node: ElementInfo): string {
  const hasName = node.name && !node.name.startsWith('<');
  const identifier = hasName ? node.name : node.id;
  const type = node.elementType || '';

  if (!type.includes(':')) return String(identifier);

  // Convert "bpmn:UserTask" to "User Task", "bpmn:StartEvent" to "Start Event" etc.
  const typeString = type
    .replace(/.*:(.*)/, '$1')
    .replace(/([A-Z])/g, ' $1')
    .trim();

  return `${typeString}: ${identifier}`;
}

/**
 * Sorts BPMN child elements in process flow order using Kahn's topological sort
 * with cycle detection via DFS to handle loops in the process.
 *
 * Algorithm:
 * 1. Separates pure EndEvents (bpmn:EndEvent) as these always go last
 * 2. Runs DFS on remaining elements to detect backedges (cycles)
 * 3. Runs Kahn's topological sort ignoring back-edges to break cycles
 * 4. Appends any disconnected elements in their original XML order
 * 5. Appends EndEvents at the very end
 *
 * BoundaryEvents are treated as normal flow elements (not moved to end)
 *
 * @param el - the parent bpmn-js element whose flowElements contain the sequence flows
 * @param children - the already-transformed ElementInfo children to sort
 * @returns sorted copy of children in process flow order
 */
export function sortChildrenByFlow(el: any, children: ElementInfo[]): ElementInfo[] {
  if (children.length === 0) return children;

  const childMap = new Map(children.map((n) => [n.id, n]));

  // Get bpmn element by id from parent's flowElements
  const flowElements: any[] = el.flowElements ?? el.processRef?.flowElements ?? [];
  const getBpmnElement = (id: string) => flowElements.find((e: any) => e.id === id);

  const nonEndBpmn = children
    .filter((n) => n.elementType !== 'bpmn:EndEvent')
    .map((n) => getBpmnElement(n.id))
    .filter(Boolean);

  // Detect backedges using DFS to break cycles
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const backEdges = new Set<string>();

  function dfs(node: any) {
    visited.add(node.id);
    inStack.add(node.id);
    const outgoing = node.outgoing?.map((flow: any) => flow.targetRef) || [];
    for (const neighbor of outgoing) {
      if (!childMap.has(neighbor.id)) continue;
      if (!visited.has(neighbor.id)) {
        dfs(neighbor);
      } else if (inStack.has(neighbor.id)) {
        backEdges.add(`${node.id}->${neighbor.id}`);
      }
    }
    inStack.delete(node.id);
  }

  nonEndBpmn.forEach((n) => {
    if (!visited.has(n.id)) dfs(n);
  });

  const incomingCount = new Map<string, number>(
    nonEndBpmn.map((n) => [
      n.id,
      n.incoming
        ?.map((flow: any) => flow.sourceRef)
        .filter((source: any) => childMap.has(source.id) && !backEdges.has(`${source.id}->${n.id}`))
        .length || 0,
    ]),
  );

  const sorted: ElementInfo[] = [];
  const queue = nonEndBpmn.filter((n) => incomingCount.get(n.id) === 0);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentInfo = childMap.get(current.id);
    if (currentInfo) sorted.push(currentInfo);

    const outgoing = current.outgoing?.map((flow: any) => flow.targetRef) || [];
    for (const target of outgoing) {
      if (!childMap.has(target.id)) continue;
      if (backEdges.has(`${current.id}->${target.id}`)) continue;
      const remaining = (incomingCount.get(target.id) ?? 0) - 1;
      incomingCount.set(target.id, remaining);
      if (remaining === 0) {
        const targetBpmn = getBpmnElement(target.id);
        if (targetBpmn) queue.push(targetBpmn);
      }
    }
  }

  // Append any disconnected non-end elements in original order
  if (sorted.length < nonEndBpmn.length) {
    const sortedIds = new Set(sorted.map((n) => n.id));
    children
      .filter((n) => n.elementType !== 'bpmn:EndEvent' && !sortedIds.has(n.id))
      .forEach((n) => sorted.push(n));
  }

  // End events always last
  sorted.push(...children.filter((n) => n.elementType === 'bpmn:EndEvent'));

  return sorted;
}

// check for empty event
export function isInstanceElementEmpty(node: ElementInfo): boolean {
  return (
    !node.instanceStatus?.logEntries?.length &&
    !node.instanceStatus?.token &&
    !node.description &&
    !node.image &&
    !node.meta
  );
}

// variable changes for each individial event or element
function hasVariableChangesForElement(instance: InstanceInfo, node: ElementInfo): boolean {
  return instance.log
    .filter((l) => l.flowElementId === node.id)
    .some((l) => l.variableChanges && Object.keys(l.variableChanges).length > 0);
}

// get variables changed by or during an element
export function getVariablesForElement(
  instance: InstanceInfo,
  elementId: string,
): { name: string; oldValue?: string; value: string; changedTime: number }[] {
  const result: { name: string; oldValue?: string; value: string; changedTime: number }[] = [];

  const logEntries = instance.log.filter((l) => l.flowElementId === elementId);

  for (const logEntry of logEntries) {
    if (!logEntry.variableChanges) continue;
    for (const [name, changes] of Object.entries(logEntry.variableChanges)) {
      for (const change of changes) {
        result.push({
          name,
          oldValue:
            change.oldValue !== undefined
              ? typeof change.oldValue === 'object'
                ? JSON.stringify(change.oldValue)
                : String(change.oldValue)
              : undefined,
          value:
            change.newValue === null || change.newValue === undefined
              ? '—'
              : typeof change.newValue === 'object'
                ? JSON.stringify(change.newValue)
                : String(change.newValue),
          changedTime: change.changedTime,
        });
      }
    }
  }

  return result;
}

/**
 * Returns true if a process element has no displayable content.
 */
export function isProcessElementEmpty(node: ElementInfo): boolean {
  // Collapsed subprocesses always have content (their expanded plane)
  if (isCollapsedSubprocess(node)) return false;
  return (
    !node.description && !node.meta && !node.milestones && !node.image && !node.children?.length
  );
}

/**
 * Makes an SVG string responsive
 * preserving the viewBox for correct scaling.
 * @param svg: the raw SVG string
 * @param fullWidth: if true (root diagram) stretch to full container width,
 *                   if false (individual element) use natural size up to max
 */
export function makeSvgResponsive(svg: string, fullWidth = false): string {
  const widthMatch = svg.match(/<svg[^>]*\swidth="([^"]*)"/);
  const heightMatch = svg.match(/<svg[^>]*\sheight="([^"]*)"/);
  const originalWidth = widthMatch ? widthMatch[1] : undefined;
  const originalHeight = heightMatch ? heightMatch[1] : undefined;

  const stripped = svg
    .replace(/(<svg[^>]*)\swidth="[^"]*"/g, '$1')
    .replace(/(<svg[^>]*)\sheight="[^"]*"/g, '$1');

  const naturalWidth = originalWidth ? `${originalWidth}px` : '100%';
  const naturalHeight = originalHeight ? `${originalHeight}px` : 'auto';

  return stripped.replace(
    /<svg/,
    `<svg overflow="visible" preserveAspectRatio="xMidYMid meet" class="${fullWidth ? 'bpmn-root-svg' : 'bpmn-element-svg'}" style="display:block;width:${naturalWidth};height:${naturalHeight};max-width:100%"`,
  );
}

/**
 * Builds base TOC children for any element (Diagram, Description, Image, Meta, Milestones).
 * Used by both process and instance TOC builders.
 */
function buildBaseElementTocChildren(
  node: ElementInfo,
  href: (id: string) => string,
  showElementSVG: boolean,
): AnchorLinkItemProps[] {
  const children: AnchorLinkItemProps[] = [];

  if (showElementSVG || !!node.children?.length) {
    children.push({
      key: `${node.id}_diagram`,
      href: href(`#${node.id}_diagram_page`),
      title: 'Diagram Element',
    });
  }
  if (node.description) {
    children.push({
      key: `${node.id}_description`,
      href: href(`#${node.id}_description_page`),
      title: 'Description',
    });
  }
  if (node.image) {
    children.push({
      key: `${node.id}_image`,
      href: href(`#${node.id}_image_page`),
      title: 'Overview Image',
    });
  }
  if (node.meta) {
    children.push({
      key: `${node.id}_meta`,
      href: href(`#${node.id}_meta_page`),
      title: 'Meta Data',
    });
  }
  if (node.milestones) {
    children.push({
      key: `${node.id}_milestones`,
      href: href(`#${node.id}_milestone_page`),
      title: 'Milestones',
    });
  }

  return children;
}

/**
 * Builds TOC items for boundary events since they are displayed attached to element.
 */
function buildBoundaryEventTocItems(
  node: ElementInfo,
  href: (id: string) => string,
): AnchorLinkItemProps[] {
  const items: AnchorLinkItemProps[] = [];
  if (!node.boundaryEvents?.length) return items;

  node.boundaryEvents.forEach((be) => {
    const beLabel = getElementTypeLabel(be);
    if (be.description) {
      items.push({
        key: `${be.id}_description`,
        href: href(`#${be.id}_description_page`),
        title: `${beLabel} — Description`,
      });
    }
    if (be.meta) {
      items.push({
        key: `${be.id}_meta`,
        href: href(`#${be.id}_meta_page`),
        title: `${beLabel} — Meta Data`,
      });
    }
    if (be.milestones) {
      items.push({
        key: `${be.id}_milestones`,
        href: href(`#${be.id}_milestone_page`),
        title: `${beLabel} — Milestones`,
      });
    }
  });

  return items;
}

/**
 * Builds TOC items for the process documentation page.
 * Used in both the sidebar TOC and the printed TOC.
 */
export function buildProcessTocItems(
  hierarchy: ElementInfo,
  settings: Record<string, boolean>,
  linksDisabled = false,
): AnchorLinkItemProps[] {
  const href = (id: string) => (linksDisabled ? '' : id);

  const allChildren = hierarchy.children || [];

  // Main list: exclude event-triggered and expanded subprocesses
  // Keep collapsed subprocesses (nestedSubprocess) in main list
  const mainChildren = allChildren.filter(
    (child) =>
      !isExcludedFromMainList(child) && (settings.hideEmpty || !isProcessElementEmpty(child)),
  );

  // Subprocess sections: expanded subprocesses and event-triggered subprocesses
  // expanded subprocesses would be displayed first, then event-triggered
  const subprocessChildren = [
    ...allChildren.filter(
      (child) => isSubprocessWithOwnSection(child) && !isEventTriggeredSubprocess(child),
    ),
    ...allChildren.filter((child) => isEventTriggeredSubprocess(child)),
  ];

  const subprocessSections: AnchorLinkItemProps[] = subprocessChildren.map((sub) => ({
    key: `subprocess_${sub.id}`,
    href: href(`#subprocess_${sub.id}_page`),
    title: getSubprocessLabel(sub),
    children: [
      ...(sub.description
        ? [
            {
              key: `subprocess_${sub.id}_summary`,
              href: href(`#subprocess_${sub.id}_description_page`),
              title: 'Summary',
            },
          ]
        : []),
      {
        key: `subprocess_${sub.id}_diagram`,
        href: href(`#subprocess_${sub.id}_diagram_page`),
        title: 'Process Diagram',
      },
      ...(sub.children?.length
        ? [
            {
              key: `subprocess_${sub.id}_elements`,
              href: href(`#subprocess_${sub.id}_elements_page`),
              title: 'Element Details',
              children: (sub.children || []).map((child) => ({
                key: child.id,
                href: href(`#${child.id}_page`),
                title: getElementTypeLabel(child),
              })),
            },
          ]
        : []),
    ],
  }));

  return [
    {
      key: 'process_overview',
      href: href(`#${hierarchy.id}_page`),
      title: 'Process Overview',
      children: [
        ...(hierarchy.description
          ? [{ key: 'summary', href: href(`#${hierarchy.id}_description_page`), title: 'Summary' }]
          : []),
        {
          key: 'process_diagram',
          href: href(`#${hierarchy.id}_diagram_page`),
          title: 'Process Diagram',
        },
        { key: 'process_details', href: href('#process_details_page'), title: 'Process Details' },
      ],
    },
    {
      key: 'process_element_details',
      href: href('#process_element_details_page'),
      title: 'Process Element Details',
      children: mainChildren.map((child) => ({
        key: child.id,
        href: href(`#${child.id}_page`),
        title: getElementTypeLabel(child),
        children: [
          ...buildBaseElementTocChildren(child, href, !!settings.showElementSVG),
          ...buildBoundaryEventTocItems(child, href),
        ],
      })),
    },
    ...subprocessSections,
  ];
}

/**
 * Builds TOC items for the instance documentation page.
 * Used in both the sidebar TOC and the printed TOC.
 */
export function buildInstanceTocItems(
  hierarchy: ElementInfo,
  settings: Record<string, boolean>,
  instance: InstanceInfo,
  linksDisabled = false,
): AnchorLinkItemProps[] {
  const href = (id: string) => (linksDisabled ? '' : id);

  function buildElementChildren(node: ElementInfo): AnchorLinkItemProps[] {
    const hasLog = !!node.instanceStatus?.logEntries?.length;
    const hasToken = !!node.instanceStatus?.token;

    return [
      ...buildBaseElementTocChildren(node, href, !!settings.showElementSVG),
      ...((hasLog || hasToken) && settings.showInstanceStatus
        ? [
            {
              key: `${node.id}_execution_log`,
              href: href(`#${node.id}_execution_log_page`),
              title: 'Execution Log',
            },
          ]
        : []),
      ...(settings.showInstanceVariables && hasVariableChangesForElement(instance, node)
        ? [
            {
              key: `${node.id}_variable_changes`,
              href: href(`#${node.id}_variable_changes_page`),
              title: 'Variable Changes',
            },
          ]
        : []),
      ...buildBoundaryEventTocItems(node, href),
    ];
  }

  function buildDetailedLogItems(nodes: ElementInfo[]): AnchorLinkItemProps[] {
    const result: AnchorLinkItemProps[] = [];

    nodes
      .filter((node) => settings.hideEmpty || !isInstanceElementEmpty(node))
      .filter((node) => !isExcludedFromMainList(node))
      .forEach((node) => {
        result.push({
          key: node.id,
          href: href(`#${node.id}_page`),
          title: getElementTypeLabel(node),
          children: buildElementChildren(node),
        });
      });

    return result;
  }

  function buildSubprocessTocItems(nodes: ElementInfo[]): AnchorLinkItemProps[] {
    return nodes
      .filter((node) => isSubprocessWithOwnSection(node))
      .map((sub) => ({
        key: `subprocess_${sub.id}`,
        href: href(`#subprocess_${sub.id}_page`),
        title: getSubprocessLabel(sub),
        children: [
          ...(sub.description
            ? [
                {
                  key: `subprocess_${sub.id}_summary`,
                  href: href(`#subprocess_${sub.id}_description_page`),
                  title: 'Summary',
                },
              ]
            : []),
          {
            key: `subprocess_${sub.id}_diagram`,
            href: href(`#subprocess_${sub.id}_diagram_page`),
            title: 'Process Diagram',
          },
          ...(sub.children?.length
            ? [
                {
                  key: `subprocess_${sub.id}_elements`,
                  href: href(`#subprocess_${sub.id}_elements_page`),
                  title: 'Element Details',
                  children: (sub.children || [])
                    .filter((child) => settings.hideEmpty || !isInstanceElementEmpty(child))
                    .map((child) => ({
                      key: child.id,
                      href: href(`#${child.id}_page`),
                      title: getElementTypeLabel(child),
                      children: buildElementChildren(child),
                    })),
                },
              ]
            : []),
        ],
      }));
  }

  return [
    {
      key: 'process_overview',
      href: href('#process_overview_page'),
      title: 'Process Overview',
      children: [
        { key: 'process_summary', href: href('#process_summary_page'), title: 'Summary' },
        { key: 'process_diagram', href: href('#process_diagram_page'), title: 'Process Diagram' },
        { key: 'process_details', href: href('#process_details_page'), title: 'Process Details' },
      ],
    },
    {
      key: 'execution_overview',
      href: href('#execution_overview_page'),
      title: 'Execution Overview',
      children: [
        { key: 'execution_summary', href: href('#execution_summary_page'), title: 'Summary' },
        ...(settings.showInstanceVariables &&
        instance.variables &&
        Object.keys(instance.variables).length > 0
          ? [
              {
                key: 'end_states_variables',
                href: href('#end_states_variables_page'),
                title: 'End States of Process Variables',
              },
            ]
          : []),
      ],
    },
    {
      key: 'detailed_execution_log',
      href: href('#detailed_execution_log_page'),
      title: 'Detailed Execution Log',
      children: buildDetailedLogItems(hierarchy.children || []),
    },
    ...buildSubprocessTocItems(hierarchy.children || []),
  ];
}
/**
 * Returns true if the element is an expanded subprocess (has children to show separately)
 */
function isExpandedSubprocess(node: ElementInfo): boolean {
  return (
    (node.elementType === 'bpmn:SubProcess' ||
      node.elementType === 'bpmn:AdHocSubProcess' ||
      node.elementType === 'bpmn:Transaction') &&
    !!node.children?.length &&
    !node.nestedSubprocess // not collapsed
  );
}

/**
 * Returns true if the element is a collapsed subprocess (has its own plane)
 */
export function isCollapsedSubprocess(node: ElementInfo): boolean {
  return !!node.nestedSubprocess;
}

/**
 * Returns true if the element is an event triggered subprocess
 */
function isEventTriggeredSubprocess(node: ElementInfo): boolean {
  return !!node.isEventTriggeredSubprocess;
}

/**
 * Returns true if the element gets its own separate section in the documentation.
 */
function isSubprocessWithOwnSection(node: ElementInfo): boolean {
  return (
    isExpandedSubprocess(node) || isEventTriggeredSubprocess(node) || isCollapsedSubprocess(node)
  );
}

export function isExcludedFromMainList(node: ElementInfo): boolean {
  // Expanded subprocesses and event triggered subprocesses are fully excluded from main list
  // Collapsed subprocesses stay in main list (showing collapsed view) and also get their own section
  return isExpandedSubprocess(node) || isEventTriggeredSubprocess(node);
}

/**
 * Returns a display label for a subprocess section heading
 */
export function getSubprocessLabel(node: ElementInfo): string {
  const name = node.name && !node.name.startsWith('<') ? node.name : node.id;
  if (node.isEventTriggeredSubprocess) return `Event-Triggered ${name}`;
  return name;
}

/**
 * Resolves the image url for a process element.
 * Falls back to the direct API path if the file manager url is unavailable.
 */
export async function resolveElementImageUrl(
  image: string | undefined,
  processId: string,
  spaceId: string,
  shareToken: string | null,
  getImage: (params: {
    entityId: string;
    filePath: string;
    shareToken?: string | null;
  }) => Promise<{ fileUrl?: string }>,
): Promise<string | false> {
  if (!image) return false;
  const { fileUrl } = await getImage({ entityId: processId, filePath: image, shareToken }).catch(
    () => ({ fileUrl: undefined }),
  );
  return (
    fileUrl ??
    `/api/private/${spaceId || 'unauthenticated'}/processes/${processId}/images/${image}?shareToken=${shareToken}`
  );
}

/**
 * Separates children into main elements and subprocess sections.
 * Main elements exclude subprocesses that get their own section.
 */
export function separateChildren(children: ElementInfo[]): {
  mainChildren: ElementInfo[];
  subprocessChildren: ElementInfo[];
} {
  return {
    mainChildren: children.filter((child) => !isExcludedFromMainList(child)),
    // Expanded/collapsed subprocesses first, event-triggered last
    subprocessChildren: [
      ...children.filter(
        (child) => isSubprocessWithOwnSection(child) && !isEventTriggeredSubprocess(child),
      ),
      ...children.filter((child) => isEventTriggeredSubprocess(child)),
    ],
  };
}

/**
 * Groups boundary events under their attached elements.
 * Boundary events are removed from the top level list and added
 * as boundaryEvents on their attached element.
 */
export function groupBoundaryEvents(children: ElementInfo[]): ElementInfo[] {
  const boundaryEvents = children.filter((n) => n.elementType === 'bpmn:BoundaryEvent');
  const nonBoundary = children.filter((n) => n.elementType !== 'bpmn:BoundaryEvent');

  // Build a map for quick lookup
  const elementMap = new Map(nonBoundary.map((n) => [n.id, n]));

  for (const be of boundaryEvents) {
    if (be.attachedToElementId) {
      const parent = elementMap.get(be.attachedToElementId);
      if (parent) {
        if (!parent.boundaryEvents) parent.boundaryEvents = [];
        parent.boundaryEvents.push(be);
      }
    }
  }

  return nonBoundary;
}
