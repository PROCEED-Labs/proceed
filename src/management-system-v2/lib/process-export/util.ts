import { v4 } from 'uuid';

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
export async function getSVGFromBPMN(bpmn: string, subprocessId?: string) {
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

  const { svg } = await viewer.saveSVG();

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
