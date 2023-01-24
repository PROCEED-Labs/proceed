import Viewer from 'bpmn-js/lib/Viewer';
import { getXmlByProcess } from '@/frontend/helpers/process-export/export-preparation.js';
import { getSVG } from '@/frontend/helpers/process-export/process-export.js';

async function getMaxResolutionOfProcess(process) {
  const xml = await getXmlByProcess(process);
  const viewerElement = document.createElement('div');
  viewerElement.id = 'canvas_' + process.id;
  document.body.appendChild(viewerElement);

  //Initiate BPMN Viewer and import XML
  let viewer = new Viewer({ container: '#' + viewerElement.id });
  await viewer.importXML(xml);
  let svg = await getSVG(viewer, true);
  document.body.removeChild(viewerElement);
  //Getting width and height from BPMN SVG
  let width = svg.split('width="')[1].split('"')[0];
  let height = svg.split('height="')[1].split('"')[0];
  const max = Math.floor(Math.sqrt(268400000 / (width * height)));
  return max;
}

export async function getMaximumResolution(processes) {
  let maxValuePromises = [];
  processes.forEach((process) => {
    maxValuePromises.push(getMaxResolutionOfProcess(process));
  });

  return Math.min(...(await Promise.all(maxValuePromises)), 10);
}
