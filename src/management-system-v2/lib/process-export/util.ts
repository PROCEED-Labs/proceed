import { v4 } from 'uuid';

import { is as bpmnIs } from 'bpmn-js/lib/util/ModelUtil';
import type ElementRegistry from 'diagram-js/lib/core/ElementRegistry';

import { toBpmnObject, getElementById, getRootFromElement } from '@proceed/bpmn-helper';
import { asyncFilter } from '../helpers/javascriptHelpers';
import { getElementsByTagName } from '@proceed/bpmn-helper/src/util';

import type ViewerType from 'bpmn-js/lib/Viewer';
import type Canvas from 'diagram-js/lib/core/Canvas';
import { ProcessExportOptions } from './export-preparation';

/**
 * Transforms a definitionName of a process into a valid file path by replacing spaces
 *
 * @param definitionName the name written into the definitions element of the process
 * @returns the name that can be given to a process file or folder
 */
export function getProcessFilePathName(definitionName: string) {
  return definitionName.split(' ').join('_');
}

/**
 * Downloads the data onto the device of the user
 *
 * @param filename
 * @param data
 */
export function downloadFile(filename: string, data: Blob) {
  const objectURL = URL.createObjectURL(data);

  // Creating Anchor Element to trigger download feature
  const aLink = document.createElement('a');

  // Setting anchor tag properties
  aLink.style.display = 'none';
  aLink.download = filename;
  aLink.href = objectURL;

  // Setting anchor tag to DOM
  document.body.appendChild(aLink);
  aLink.click();
  document.body.removeChild(aLink);

  // Release Object URL, so the browser doesn't keep the reference
  URL.revokeObjectURL(objectURL);
}

// This function can't be async do to safari limitations
/** Exports a blob with the specified method in ProcessExportOptions */
export async function handleExportMethod(
  exportBlob: Promise<{ filename: string; blob: Blob } & ({} | { zip: true })>,
  options: ProcessExportOptions,
) {
  let fallback: string | undefined = undefined;

  if (options.exportMethod === 'webshare') {
    if ('canShare' in window?.navigator)
      try {
        const { blob, filename } = await exportBlob;
        navigator.share({
          files: [new File([blob], filename, { type: blob.type })],
        });
        return fallback;
      } catch (_) {}

    fallback = 'Failed, copied to clipboard instead.';
  }

  if (!('zip' in exportBlob) && (fallback || options.exportMethod === 'clipboard')) {
    // needed for clipboard export
    let prematureClipboardTypeIfNotZip;
    if (options.type === 'bpmn') {
      prematureClipboardTypeIfNotZip = 'text/plain';
    } else if (options.type === 'png') {
      prematureClipboardTypeIfNotZip = 'image/png';
    }

    if (prematureClipboardTypeIfNotZip) {
      try {
        if (!navigator.clipboard) throw false;

        const item = exportBlob.then(async ({ blob }) => {
          if (prematureClipboardTypeIfNotZip === 'text/plain') return blob.text();
          return blob;
        });

        await navigator.clipboard.write([
          new ClipboardItem({
            [prematureClipboardTypeIfNotZip!]: item,
          }),
        ]);
        return fallback;
      } catch (_) {}
    }

    fallback = 'Failed, downloaded instead.';
  }

  // default method
  await exportBlob.then(({ blob, filename }) => downloadFile(filename, blob));
  return fallback;
}

/**
 * Converts the bpmn into an svg image of the process or of subprocess contained inside the process
 *
 * @param bpmnOrViewer either the bpmn as a string or a viewer with the bpmn already imported
 * @returns the svg image as a string
 */
export async function getSVGFromBPMN(
  bpmnOrViewer: string | ViewerType,
  subprocessId?: string,
  flowElementsToExportIds: string[] = [],
) {
  let viewer: ViewerType;
  let viewerElement;

  if (typeof bpmnOrViewer === 'string') {
    const Viewer = (await import('bpmn-js/lib/Viewer')).default;

    //Creating temporary element for BPMN Viewer
    viewerElement = document.createElement('div');

    //Assigning process id to temp element and append to DOM
    viewerElement.id = 'canvas_' + v4();
    document.body.appendChild(viewerElement);

    //Create a viewer to transform the bpmn into an svg
    viewer = new Viewer({ container: '#' + viewerElement.id });
    await viewer.importXML(bpmnOrViewer);
  } else {
    viewer = bpmnOrViewer;
  }

  const canvas = viewer.get('canvas') as Canvas;

  let originalRoot;

  // target the correct plane (root process or the specified subprocess)
  if (subprocessId) {
    originalRoot = canvas.getRootElement();
    canvas.setRootElement(canvas.findRoot(`${subprocessId}_plane`)!);
  }

  canvas.zoom('fit-viewport', { x: 0, y: 0 });

  const elementRegistry = viewer.get('elementRegistry') as ElementRegistry;

  let originalVisibilityMap: { [elId: string]: string } = {};

  // if specific elements are selected for export make sure to filter out all other elements
  if (flowElementsToExportIds.length) {
    // remove connections where the source or target or both are not selected
    flowElementsToExportIds = flowElementsToExportIds.filter((id) => {
      const el = elementRegistry.get(id);

      return (
        el &&
        ((!el.source && !el.target) ||
          flowElementsToExportIds.includes(el.source.id) ||
          flowElementsToExportIds.includes(el.target.id))
      );
    });

    if (flowElementsToExportIds.length) {
      // hide all elements that are not directly selected and that are not indirectly selected due to a parent being selected
      const allElements = elementRegistry.getAll();

      const unselectedElements = await asyncFilter(allElements, async ({ businessObject }) => {
        return (
          !businessObject ||
          !(await isSelectedOrInsideSelected(
            getRootFromElement(businessObject),
            businessObject.id,
            flowElementsToExportIds,
          ))
        );
      });

      unselectedElements.forEach((el: any) => {
        // don't hide the surrounding process or subprocess plane
        if (el.type === 'bpmn:Process' || el.id.includes(subprocessId)) return;
        const elementStyle = elementRegistry.getGraphics(el).style;
        originalVisibilityMap[el.id] = elementStyle.getPropertyValue('display');
        elementStyle.setProperty('display', 'none');
      });
    }
  }

  const { svg } = await viewer.saveSVG();

  // reset the state
  if (viewerElement) {
    // remove the temporary element that the viewer is bound to
    document.body.removeChild(viewerElement);
  } else {
    // reset to the original state of the viewer that was passed in
    if (originalRoot) {
      canvas.setRootElement(originalRoot);
      canvas.zoom('fit-viewport', { x: 0, y: 0 });
    }

    Object.entries(originalVisibilityMap).forEach(([elId, originalDisplayValue]) => {
      elementRegistry.getGraphics(elId).style.setProperty('display', originalDisplayValue);
    });
  }

  return svg;
}

/**
 * Places title elements on each svg representation of a bpmn element to show its name or id
 * Optionally wraps the element in an anchor tag to allow linking from the svg
 *
 * @param svg
 * @param getNameOfEl function that returns the name of an element with a specific id when possible
 * @param createLink function that creates a link string from an elements id
 * @returns the svg with added title and optionally also added anchor elements
 */
export function addTooltipsAndLinksToSVG(
  svg: string,
  getNameOfEl: (id: string) => string | undefined,
  createLink?: (id: string) => string,
) {
  const svgDom = new DOMParser().parseFromString(svg, 'image/svg+xml');
  const domEls = svgDom.querySelectorAll(`[data-element-id]`);
  Array.from(domEls).forEach((el) => {
    // add a title to the svg element so a user can see its id or name when hovering over it
    const elementId = el.getAttribute('data-element-id') as string;
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = getNameOfEl(elementId) || `<${elementId}>`;
    el.appendChild(title);
    if (createLink) {
      const link = document.createElementNS('http://www.w3.org/2000/svg', 'a');
      // wrapping the parent g element in a link to link to the correct subchapter (wrapping the element itself leads to container elements not being rendered correctly)
      el?.parentElement?.parentElement?.appendChild(link);
      link.appendChild(el.parentElement as Element);
      link.setAttribute('href', createLink(elementId));
    }
  });
  svg = new XMLSerializer().serializeToString(svgDom);

  return svg;
}

/**
 * Returns the dimensions of a vector-image
 *
 * @param svg the svg string to get the size from
 * @returns the width and height of the image
 */
export function getImageDimensions(svg: string) {
  let width = 0;
  let height = 0;

  const viewBox = svg.split('<svg')[1].split('>')[0].split('viewBox="');

  if (viewBox) {
    [width, height] = viewBox[1].split('"')[0].split(' ').map(parseFloat).slice(2);
  } else {
    width = parseFloat(svg.split('width="')[1].split('"')[0]);
    height = parseFloat(svg.split('height="')[1].split('"')[0]);
  }

  return {
    width,
    height,
  };
}

/**
 * Checks for a moddle element if it is selected or if an element it is nested in is selected
 *
 * @param bpmnOrObj the bpmn that should contain the element either as a string or as an object
 * @param id the id of the moddle element
 * @param selectedElementIds the ids of the elements that are considered selected
 */
export async function isSelectedOrInsideSelected(
  bpmnOrObj: string | object,
  id: string,
  selectedElementIds: string[],
) {
  const bpmnObj = typeof bpmnOrObj === 'string' ? await toBpmnObject(bpmnOrObj) : bpmnOrObj;

  let el = getElementById(bpmnObj, id) as any;

  // this handles all elements that are directly selected or inside a selected subprocess
  while (el && !bpmnIs(el, 'bpmn:Process')) {
    if (selectedElementIds.includes(el.id)) return true;
    el = el.$parent;
  }

  const participants = getElementsByTagName(bpmnObj, 'bpmn:Participant');

  // this handles all elements that are children of a selected participant
  return (
    !!el &&
    participants.some(
      (participant) =>
        selectedElementIds.includes(participant.id) && participant.processRef?.id === el?.id,
    )
  );
}
