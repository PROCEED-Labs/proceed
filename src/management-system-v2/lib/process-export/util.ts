import { v4 } from 'uuid';

import { is as bpmnIs } from 'bpmn-js/lib/util/ModelUtil';
import type ElementRegistry from 'diagram-js/lib/core/ElementRegistry';

import { toBpmnObject, getElementById, getRootFromElement } from '@proceed/bpmn-helper';
import { asyncFilter } from '../helpers/javascriptHelpers';
import { getElementsByTagName } from '@proceed/bpmn-helper/src/util';

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

/**
 * Converts the bpmn into an svg image of the process or of subprocess contained inside the process
 *
 * @param bpmn
 * @returns the svg image as a string
 */
export async function getSVGFromBPMN(
  bpmn: string,
  subprocessId?: string,
  flowElementsToExportIds: string[] = [],
) {
  const Viewer = (await import('bpmn-js/lib/Viewer')).default;

  //Creating temporary element for BPMN Viewer
  const viewerElement = document.createElement('div');

  //Assiging process id to temp element and append to DOM
  viewerElement.id = 'canvas_' + v4();
  document.body.appendChild(viewerElement);

  //Create a viewer to transform the bpmn into an svg
  const viewer = new Viewer({ container: '#' + viewerElement.id });
  await viewer.importXML(bpmn);

  const canvas = viewer.get('canvas') as any;

  // target the correct plane (root process or the specified subprocess)
  if (subprocessId) {
    canvas.setRootElement(canvas.findRoot(`${subprocessId}_plane`));
  }

  canvas.zoom('fit-viewport', 'auto');

  const elementRegistry = viewer.get('elementRegistry') as ElementRegistry;

  // if specific elements are selected for export make sure to filter out all other elements
  if (flowElementsToExportIds.length) {
    // remove connections where the source or target or both are not selected
    flowElementsToExportIds = flowElementsToExportIds.filter((id) => {
      const el = elementRegistry.get(id);
      return (
        el &&
        (!el.source || flowElementsToExportIds.includes(el.source.id)) &&
        (!el.target || flowElementsToExportIds.includes(el.target.id))
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
        elementRegistry.getGraphics(el).style.setProperty('display', 'none');
      });
    }
  }

  const { svg } = await viewer.saveSVG();

  document.body.removeChild(viewerElement);

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

  // this handles all elements that are directly selected or insided a selected subprocess
  while (el && !bpmnIs(el, 'bpmn:Process')) {
    if (selectedElementIds.includes(el.id)) return true;
    el = el.$parent;
  }

  const participants = getElementsByTagName(bpmnObj, 'bpmn:Participant');
  console.log(participants.some(() => false));
  // this handles all elements that are children of a selected participant
  return (
    !!el &&
    participants.some(
      (participant) =>
        selectedElementIds.includes(participant.id) && participant.processRef?.id === el?.id,
    )
  );
}
