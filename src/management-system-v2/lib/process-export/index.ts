import {
  prepareExport,
  ProcessExportOptions,
  ExportProcessInfo,
  ProcessExportData,
} from './export-preparation';

import { v4 } from 'uuid';
import { jsPDF } from 'jspdf';
import jsZip from 'jszip';
import 'svg2pdf.js';

function downloadFile(filename: string, data: Blob) {
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

async function pdfExport(data: ProcessExportData) {
  const numProcesses = data.length;
  const needsZip = numProcesses > 1;

  const zip = needsZip ? new jsZip() : undefined;

  let dataHandler = needsZip ? zip!.file.bind(zip) : downloadFile;

  for (const processData of data) {
    const doc = new jsPDF({
      unit: 'pt', // needed due to a bug in jsPDF: https://github.com/yWorks/svg2pdf.js/issues/245#issuecomment-1671624250
      format: 'a4',
      orientation: 'landscape',
    });
    doc.deletePage(1);
    for (const versionData of Object.values(processData.versions)) {
      const svg = await getSVGFromBPMN(versionData.bpmn);

      const parser = new DOMParser();
      const svgDOM = parser.parseFromString(svg, 'image/svg+xml');

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
      doc.text(`Process: ${processData.definitionName} \n`, 10, 15);

      await doc.svg(svgDOM.children[0], {
        x: 0,
        y: 10,
        width: pageWidth,
        height: pageHeight,
      });
    }
    dataHandler(`${processData.definitionName}.pdf`, await doc.output('blob'));
  }

  if (needsZip) {
    downloadFile('PROCEED_Multiple-Processes_bpmn.zip', await zip!.generateAsync({ type: 'blob' }));
  }
}

async function svgExport(data: ProcessExportData) {
  const numProcesses = data.length;
  let needsZip = numProcesses > 1;

  if (!needsZip) {
    const numVersions = Object.keys(data[0].versions).length;

    needsZip = needsZip || numVersions > 1;
  }

  const zip = needsZip ? new jsZip() : undefined;

  for (const processData of data) {
    const folder = needsZip ? zip!.folder(processData.definitionName) : undefined;
    let dataHandler = needsZip ? folder!.file.bind(folder) : downloadFile;

    for (const [versionName, versionData] of Object.entries(processData.versions)) {
      const svg = await getSVGFromBPMN(versionData.bpmn!);

      const svgBlob = new Blob([svg], {
        type: 'image/svg+xml',
      });

      // a) if we output into a zip folder that uses the process name use the version name as the filename
      // b) if we output as a single file use the process name as the file name
      const filename = needsZip ? versionName : processData.definitionName;

      dataHandler(`${filename}.svg`, svgBlob);
    }
  }

  if (needsZip) {
    downloadFile('PROCEED_Multiple-Processes_bpmn.zip', await zip!.generateAsync({ type: 'blob' }));
  }
}

async function bpmnExport(data: ProcessExportData) {
  const numProcesses = data.length;
  let needsZip = numProcesses > 1;

  if (!needsZip) {
    const hasMulitpleVersions = Object.keys(data[0].versions).length > 1;
    const hasArtefacts = !!data[0].userTasks.length;

    needsZip = needsZip || hasMulitpleVersions || hasArtefacts;
  }

  const zip = needsZip ? new jsZip() : undefined;

  for (const processData of data) {
    const folder = needsZip ? zip!.folder(processData.definitionName) : undefined;
    let dataHandler = needsZip ? folder!.file.bind(folder) : downloadFile;

    for (const [versionName, versionData] of Object.entries(processData.versions)) {
      const bpmnBlob = new Blob([versionData.bpmn!], { type: 'application/xml' });

      // a) if we output into a zip folder that uses the process name use the version name as the filename
      // b) if we output as a single file use the process name as the file name
      const filename = needsZip ? versionName : processData.definitionName;

      dataHandler(`${filename}.bpmn`, bpmnBlob);
    }

    if (needsZip && processData.userTasks.length) {
      const userTaskFolder = await folder!.folder('user-tasks');
      for (const { filename, html } of processData.userTasks) {
        const htmlBlob = new Blob([html], { type: 'application/html' });
        userTaskFolder?.file(filename, htmlBlob);
      }
    }
  }

  if (needsZip) {
    downloadFile('PROCEED_Multiple-Processes_bpmn.zip', await zip!.generateAsync({ type: 'blob' }));
  }
}

export async function exportProcesses(options: ProcessExportOptions, processes: ExportProcessInfo) {
  const exportData = await prepareExport(options, processes);

  switch (options.type) {
    case 'pdf':
      await pdfExport(exportData);
      break;
    case 'svg':
      await svgExport(exportData);
      break;
    case 'bpmn':
      await bpmnExport(exportData);
      break;
  }
}
