import { v4 } from 'uuid';
import { jsPDF } from 'jspdf';
import 'svg2pdf.js';

export function exportBpmn(processName: string, bpmn: string) {
  const bpmnBlob = new Blob([bpmn], { type: 'application/xml' });

  exportFile(`${processName}.bpmn`, bpmnBlob);
}

async function getSVGFromBPMN(bpmn: string) {
  const Viewer = (await import('bpmn-js/lib/Viewer')).default;

  //Creating temporary element for BPMN Viewer
  const viewerElement = document.createElement('div');

  //Assiging process id to temp element and append to DOM
  viewerElement.id = 'canvas_' + v4();
  document.body.appendChild(viewerElement);

  //Create a viewer to transform the bpmn into an svg
  const viewer = new Viewer({ container: '#' + viewerElement.id });
  await viewer.importXML(bpmn);
  const { svg } = await viewer.saveSVG();

  return svg;
}

export async function exportSVG(processName: string, bpmn: string) {
  const svg = await getSVGFromBPMN(bpmn);

  const svgBlob = new Blob([svg], {
    type: 'image/svg+xml',
  });

  exportFile(`${processName}.svg`, svgBlob);
}

export async function exportPDF(processName: string, bpmn: string) {
  const svg = await getSVGFromBPMN(bpmn);

  const parser = new DOMParser();
  const svgDOM = parser.parseFromString(svg, 'image/svg+xml');

  const doc = new jsPDF({
    unit: 'pt', // needed due to a bug in jsPDF: https://github.com/yWorks/svg2pdf.js/issues/245#issuecomment-1671624250
    format: 'a4',
    orientation: 'landscape',
  });

  doc.deletePage(1);

  // get image dimensions
  let svgWidth = parseFloat(svg.split('width="')[1].split('"')[0]);
  let svgHeight = 20 + parseFloat(svg.split('height="')[1].split('"')[0]);

  // adding a new page, second parameter orientation: p - portrait, l - landscape
  doc.addPage([svgWidth, svgHeight], svgHeight > svgWidth ? 'p' : 'l');

  //Getting PDF Documents width and height
  const pageWidth = doc.internal.pageSize.getWidth() - 10;
  const pageHeight = doc.internal.pageSize.getHeight() - 10;

  //Setting pdf font size
  doc.setFontSize(15);

  //Adding Header to the Pdf
  // TODO: make sure that the text fits both in landscape as well as in portrait mode
  doc.text(`Process: ${processName} \n`, 10, 15);

  await doc.svg(svgDOM.children[0], {
    x: 0,
    y: 10,
    width: pageWidth,
    height: pageHeight,
  });

  await doc.save(`${processName}.pdf`);
}

function exportFile(processName: string, data: Blob) {
  const objectURL = URL.createObjectURL(data);

  // Creating Anchor Element to trigger download feature
  const aLink = document.createElement('a');

  // Setting anchor tag properties
  aLink.style.display = 'none';
  aLink.download = processName;
  aLink.href = objectURL;

  // Setting anchor tag to DOM
  document.body.appendChild(aLink);
  aLink.click();
  document.body.removeChild(aLink);

  // Release Object URL, so browser dont keep reference
  URL.revokeObjectURL(objectURL);
}
