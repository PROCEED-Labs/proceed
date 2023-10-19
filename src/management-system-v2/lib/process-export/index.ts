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

/**
 * Downloads the data onto the device of the user
 *
 * @param filename
 * @param data
 */
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

/**
 * Converts the bpmn into an svg image of the process or of subprocess contained inside the process
 *
 * @param bpmn
 * @returns the svg image as a string
 */
async function getSVGFromBPMN(bpmn: string, subprocessId?: string) {
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
 * Executes the logic that adds the page for a specific process version/collapsed subprocess
 *
 * @param processData the data of the complete process
 * @param version the specific version to handle
 * @param pdf the pdf to add a page to
 * @param isImport if the data to be added is part of an imported process
 * @param subprocessId if a specific collapsed subprocess should be added this is the id of the subprocess element
 * @param subprocessName the name of the collapsed subprocess to be added
 */
async function addPDFPage(
  processData: ProcessExportData,
  version: string,
  pdf: jsPDF,
  isImport = false,
  subprocessId?: string,
  subprocessName?: string,
) {
  const versionData = processData.versions[version];
  // get the svg so we can display the process as a vector graphic inside the pdf
  const svg = await getSVGFromBPMN(versionData.bpmn, subprocessId);
  const parser = new DOMParser();
  const svgDOM = parser.parseFromString(svg, 'image/svg+xml');

  let numTitleLines = 1;
  let docTitle = `Version: ${versionData.name || version}`;

  if (isImport) {
    ++numTitleLines;
    docTitle =
      `Imported Process: ${processData.definitionName || processData.definitionId}\n` + docTitle;
  }

  if (subprocessId) {
    ++numTitleLines;
    docTitle += `\nSubprocess: ${subprocessName || subprocessId}`;
  }

  // get image dimensions
  let svgWidth = parseFloat(svg.split('width="')[1].split('"')[0]);
  let svgHeight = 10 * (numTitleLines + 1) + parseFloat(svg.split('height="')[1].split('"')[0]);

  // adding a new page, second parameter orientation: p - portrait, l - landscape
  pdf.addPage([svgWidth, svgHeight], svgHeight > svgWidth ? 'p' : 'l');

  //Getting PDF Documents width and height
  const pageWidth = pdf.internal.pageSize.getWidth() - 10;
  const pageHeight = pdf.internal.pageSize.getHeight() - 10;

  //Setting pdf font size
  pdf.setFontSize(15);

  //Adding Header to the Pdf
  // TODO: make sure that the text fits both in landscape as well as in portrait mode
  pdf.text(docTitle, 10 * numTitleLines, 15);

  await pdf.svg(svgDOM.children[0], {
    x: 0,
    y: 10 * numTitleLines,
    width: pageWidth,
    height: pageHeight,
  });
}

/**
 * Allows to recursively add versions of the process and its imports to the pdf
 *
 * @param processesData the data of all processes
 * @param processData the data of the complete process
 * @param version the specific version to handle
 * @param pdf the pdf to add a page to
 * @param isImport if the version is of an import
 */
async function handleProcessPdfExportData(
  processesData: ProcessesExportData,
  processData: ProcessExportData,
  version: string,
  pdf: jsPDF,
  isImport = false,
) {
  // add the main process (version) data
  await addPDFPage(processData, version, pdf, isImport);

  const versionData = processData.versions[version];
  // add all collapsed subprocesses (if requested)
  for (const { id: subprocessId, name: subprocessName } of versionData.subprocesses) {
    await addPDFPage(processData, version, pdf, isImport, subprocessId, subprocessName);
  }

  // add all imported processes recursively
  for (const { definitionId, processVersion } of versionData.imports) {
    const importData = processesData.find((el) => el.definitionId === definitionId);
    if (importData) {
      await handleProcessPdfExportData(processesData, importData, processVersion, pdf, true);
    }
  }
}

async function pdfExport(
  processesData: ProcessesExportData,
  processData: ProcessExportData,
  zip?: jsZip | null,
) {
  // create the pdf file for the process
  const pdf = new jsPDF({
    unit: 'pt', // needed due to a bug in jsPDF: https://github.com/yWorks/svg2pdf.js/issues/245#issuecomment-1671624250
    format: 'a4',
    orientation: 'landscape',
  });
  pdf.deletePage(1);

  // only export the versions that were explicitly selected for export inside the pdf file for the given process
  const nonImportVersions = Object.entries(processData.versions)
    .filter(([_, { isImport }]) => !isImport)
    .map(([version]) => version);

  for (const version of nonImportVersions) {
    await handleProcessPdfExportData(processesData, processData, version, pdf);
  }

  if (zip) {
    zip.file(`${processData.definitionName}.pdf`, await pdf.output('blob'));
  } else {
    downloadFile(`${processData.definitionName}.pdf`, await pdf.output('blob'));
  }
}

/**
 * Executes the logic that adds the file for a specific process version/collapsed subprocess
 *
 * @param processData the data of the complete process
 * @param version the specific version to handle
 * @param isImport if the data to be added is part of an imported process
 * @param zipFolder the folder to add the svg to (optional since we can export a single file directly as an svg which is decided before this function is called)
 * @param subprocessId if a specific collapsed subprocess should be added this is the id of the subprocess element
 * @param subprocessName the name of the collapsed subprocess to be added
 */
async function addSVGFile(
  processData: ProcessExportData,
  version: string,
  isImport = false,
  zipFolder?: jsZip | null,
  subprocessId?: string,
  subprocessName?: string,
) {
  const versionData = processData.versions[version];
  const svg = await getSVGFromBPMN(versionData.bpmn!, subprocessId);

  const svgBlob = new Blob([svg], {
    type: 'image/svg+xml',
  });

  let versionName = version;
  // if the version data contains an explicit name use that instead of the the current versionName which is just the version id or "latest"
  if (versionData.name) {
    versionName = versionData.name;
  }
  if (versionName !== 'latest') versionName = 'version_' + versionName;

  // a) if we output into a zip folder that uses the process name use the version name as the filename
  // b) if we output as a single file use the process name as the file name
  let filename = zipFolder ? versionName : processData.definitionName;

  // add additional information if this file is added as additional info for another process (only possible in case of zip export)
  if (isImport) {
    filename = `import_${processData.definitionName || processData.definitionId}_` + filename;
  }
  if (subprocessId) {
    filename += `_subprocess_${subprocessName || subprocessId}`;
  }

  if (zipFolder) {
    zipFolder.file(`${filename}.svg`, svgBlob);
  } else {
    downloadFile(`${filename}.svg`, svgBlob);
  }
}

/**
 * Allows to recursively add versions of the process and its imports to the folder
 *
 * @param processesData the data of all processes
 * @param processData the data of the complete process
 * @param version the specific version to handle
 * @param isImport if the version is of an import
 * @param zipFolder the folder to add the svg to (optional since we can export a single file directly as an svg which is decided before this function is called)
 */
async function handleProcessSVGExportData(
  processesData: ProcessesExportData,
  processData: ProcessExportData,
  version: string,
  isImport = false,
  zipFolder?: jsZip | null,
) {
  // add the main process (version) file
  await addSVGFile(processData, version, isImport, zipFolder);

  const versionData = processData.versions[version];
  // add collapsed subprocesses as additional files
  for (const { id: subprocessId, name: subprocessName } of versionData.subprocesses) {
    await addSVGFile(processData, version, isImport, zipFolder, subprocessId, subprocessName);
  }

  // recursively add imports as additional files into the same folder
  for (const { definitionId, processVersion } of versionData.imports) {
    const importData = processesData.find((el) => el.definitionId === definitionId);
    if (importData) {
      await handleProcessSVGExportData(processesData, importData, processVersion, true, zipFolder);
    }
  }
}

async function svgExport(
  processesData: ProcessesExportData,
  processData: ProcessExportData,
  zipFolder?: jsZip | null,
) {
  // only export the versions that were explicitly selected for export inside the folder for the given process
  const nonImportVersions = Object.entries(processData.versions)
    .filter(([_, { isImport }]) => !isImport)
    .map(([version]) => version);

  for (const version of nonImportVersions) {
    await handleProcessSVGExportData(processesData, processData, version, false, zipFolder);
  }
}

async function bpmnExport(processData: ProcessExportData, zipFolder?: jsZip | null) {
  for (let [versionName, versionData] of Object.entries(processData.versions)) {
    // if the version data contains an explicit name use that instead of the the current versionName which is just the version id or "latest"
    if (versionData.name) {
      versionName = versionData.name;
    }
    if (versionName !== 'latest') versionName = 'version_' + versionName;

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
    // export the user tasks of the process
    if (processData.userTasks.length) {
      const userTaskFolder = zipFolder.folder('user-tasks');
      for (const { filename, html } of processData.userTasks) {
        const htmlBlob = new Blob([html], { type: 'application/html' });
        userTaskFolder?.file(filename, htmlBlob);
      }
    }
    // export the images used either for flow elements or inside user task html
    if (processData.images.length) {
      const imageFolder = zipFolder.folder('images');
      for (const { filename, data: imageData } of processData.images) {
        imageFolder?.file(filename, imageData);
      }
    }
  }
}

/**
 * Exports the given processes either as a single file or if necessary inside a zip file
 *
 * @param options the options that were selected by the user
 * @param processes the processes(and versions) to export
 */
export async function exportProcesses(options: ProcessExportOptions, processes: ExportProcessInfo) {
  const exportData = await prepareExport(options, processes);

  // determine if a zip export is required
  let needsZip = false;
  if (options.type === 'pdf') {
    // in case of a pdf export all data for a single process (including imported processes) will be exported in a single pdf file
    const numNonImports = exportData.filter(({ isImport }) => !isImport).length;
    needsZip = numNonImports > 1;
  } else {
    // for other export types we need one file for every kind of additional data (artefacts, collapsed subprocesses, imports)
    const numProcesses = exportData.length;
    // the following cases are only relevant if there is only one process to export (in any other case needsZip becomes true anyway)
    const hasMulitpleVersions = Object.keys(exportData[0].versions).length > 1;
    const hasArtefacts = !!exportData[0].userTasks.length || !!exportData[0].images.length;
    // this becomes relevant if there is only one version (otherwise hasMultipleVersions will lead to needsZip being true anyway)
    const withSubprocesses = Object.values(exportData[0].versions)[0].subprocesses.length > 0;

    needsZip = numProcesses > 1 || hasMulitpleVersions || hasArtefacts || withSubprocesses;
  }

  const zip = needsZip ? new jsZip() : undefined;

  for (const processData of exportData) {
    if (options.type === 'pdf') {
      // handle imports inside the pdfExport function
      if (!processData.isImport) await pdfExport(exportData, processData, zip);
    } else {
      if (options.type === 'bpmn') {
        const folder = zip?.folder(processData.definitionName);
        await bpmnExport(processData, folder);
      }
      // handle imports inside the svgExport function
      if (options.type === 'svg' && !processData.isImport) {
        const folder = zip?.folder(processData.definitionName);
        await svgExport(exportData, processData, folder);
      }
    }
  }

  if (needsZip) {
    downloadFile('PROCEED_Multiple-Processes_bpmn.zip', await zip!.generateAsync({ type: 'blob' }));
  }
}
