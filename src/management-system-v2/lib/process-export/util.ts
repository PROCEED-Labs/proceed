import { v4 } from 'uuid';

import { toBpmnObject, toBpmnXml, getElementById } from '@proceed/bpmn-helper';

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

  // if specific elements are selected for export make sure to filter out all other elements
  if (flowElementsToExportIds.length) {
    const bpmnObj: any = await toBpmnObject(bpmn!);
    // remove connections where the source or target or both are not selected
    flowElementsToExportIds = flowElementsToExportIds.filter((id) => {
      const el = getElementById(bpmnObj, id) as any;
      return (
        el &&
        (!el.sourceRef || flowElementsToExportIds.includes(el.sourceRef.id)) &&
        (!el.targetRef || flowElementsToExportIds.includes(el.targetRef.id))
      );
    });

    if (flowElementsToExportIds.length) {
      // find the correct plane (either the root process/collaboration or a subprocess)
      const { plane } = bpmnObj.diagrams.find((el: any) =>
        subprocessId
          ? // either find the subprocess plane
            el.plane.bpmnElement.id === subprocessId
          : // or the root process/collaboration plane
            el.plane.bpmnElement.$type !== 'bpmn:SubProcess',
      );
      // remove the visualisation of the elements that are not selected
      plane.planeElement = plane.planeElement.filter((diEl: any) =>
        flowElementsToExportIds.some((id) => id === diEl.bpmnElement.id),
      );
      bpmn = await toBpmnXml(bpmnObj);
    }
  }

  //Create a viewer to transform the bpmn into an svg
  const viewer = new Viewer({ container: '#' + viewerElement.id });
  await viewer.importXML(bpmn);

  const canvas = viewer.get('canvas') as any;

  // target the correct plane (root process or the specified subprocess)
  if (subprocessId) {
    canvas.setRootElement(canvas.findRoot(`${subprocessId}_plane`));
  }

  canvas.zoom('fit-viewport', 'auto');

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
