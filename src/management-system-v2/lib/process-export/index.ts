import {
  prepareExport,
  ProcessExportOptions,
  ExportProcessInfo,
  ProcessExportData,
  ProcessesExportData,
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

async function pdfExport(processData: ProcessExportData, zip?: jsZip | null) {
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

  if (zip) {
    zip.file(`${processData.definitionName}.pdf`, await doc.output('blob'));
  } else {
    downloadFile(`${processData.definitionName}.pdf`, await doc.output('blob'));
  }
}

async function svgExport(processData: ProcessExportData, zipFolder?: jsZip | null) {
  for (const [versionName, versionData] of Object.entries(processData.versions)) {
    const svg = await getSVGFromBPMN(versionData.bpmn!);

    const svgBlob = new Blob([svg], {
      type: 'image/svg+xml',
    });

    // a) if we output into a zip folder that uses the process name use the version name as the filename
    // b) if we output as a single file use the process name as the file name
    const filename = zipFolder ? versionName : processData.definitionName;
    if (zipFolder) {
      zipFolder.file(`${filename}.svg`, svgBlob);
    } else {
      downloadFile(`${filename}.svg`, svgBlob);
    }
  }
}

async function bpmnExport(processData: ProcessExportData, zipFolder?: jsZip | null) {
  for (const [versionName, versionData] of Object.entries(processData.versions)) {
    const bpmnBlob = new Blob([versionData.bpmn!], { type: 'application/xml' });

    // a) if we output into a zip folder that uses the process name use the version name as the filename
    // b) if we output as a single file use the process name as the file name
    const filename = zipFolder ? versionName : processData.definitionName;
    if (zipFolder) {
      zipFolder.file(`${filename}.bpmn`, bpmnBlob);
    } else {
      downloadFile(`${filename}.bpmn`, bpmnBlob);
    }
  }

  if (zipFolder) {
    if (processData.userTasks.length) {
      const userTaskFolder = zipFolder.folder('user-tasks');
      for (const { filename, html } of processData.userTasks) {
        const htmlBlob = new Blob([html], { type: 'application/html' });
        userTaskFolder?.file(filename, htmlBlob);
      }
    }
    if (processData.images.length) {
      const imageFolder = zipFolder.folder('images');
      for (const { filename, data: imageData } of processData.images) {
        imageFolder?.file(filename, imageData);
      }
    }
  }
}

export async function exportProcesses(options: ProcessExportOptions, processes: ExportProcessInfo) {
  const exportData = await prepareExport(options, processes);

  const numProcesses = exportData.length;
  let needsZip = numProcesses > 1;

  // if the export type is not pdf we might still need a zip to export additional files (pdfs can include everything in one file)
  if (!needsZip && options.type !== 'pdf') {
    const hasMulitpleVersions = Object.keys(exportData[0].versions).length > 1;
    const hasArtefacts = !!exportData[0].userTasks.length || !!exportData[0].images.length;

    needsZip = needsZip || hasMulitpleVersions || hasArtefacts;
  }

  const zip = needsZip ? new jsZip() : undefined;

  for (const processData of exportData) {
    if (options.type === 'pdf') {
      await pdfExport(processData, zip);
    } else {
      const folder = needsZip ? zip!.folder(processData.definitionName) : undefined;
      if (options.type === 'bpmn') await bpmnExport(processData, folder);
      if (options.type === 'svg') await svgExport(processData, folder);
    }
  }

  if (needsZip) {
    downloadFile('PROCEED_Multiple-Processes_bpmn.zip', await zip!.generateAsync({ type: 'blob' }));
  }
}
