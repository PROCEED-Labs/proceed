import {
  prepareExport,
  ProcessExportOptions,
  ExportProcessInfo,
  ProcessExportData,
} from './export-preparation';

import { downloadFile } from './util';

import jsZip from 'jszip';
import 'svg2pdf.js';

import pdfExport from './pdf-export';
import { pngExport, svgExport } from './image-export';

async function bpmnExport(processData: ProcessExportData, zipFolder?: jsZip | null) {
  for (let [versionName, versionData] of Object.entries(processData.versions)) {
    // if the version data contains an explicit name use that instead of the the current versionName which is just the version id
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
    const withSubprocesses = Object.values(exportData[0].versions)[0].layers.length > 1;

    needsZip = numProcesses > 1 || hasMulitpleVersions || hasArtefacts || withSubprocesses;
  }

  const zip = needsZip ? new jsZip() : undefined;

  for (const processData of exportData) {
    if (options.type === 'pdf') {
      // handle imports inside the pdfExport function
      if (!processData.isImport) {
        await pdfExport(
          exportData,
          processData,
          options.metaData,
          options.a4,
          options.exportSelectionOnly,
          zip,
        );
      }
    } else {
      if (options.type === 'bpmn') {
        const folder = zip?.folder(processData.definitionName.split(' ').join('_'));
        await bpmnExport(processData, folder);
      }
      // handle imports inside the svgExport function
      if (options.type === 'svg' && !processData.isImport) {
        const folder = zip?.folder(processData.definitionName.split(' ').join('_'));
        await svgExport(exportData, processData, options.exportSelectionOnly, folder);
      }
      if (options.type === 'png' && !processData.isImport) {
        const folder = zip?.folder(processData.definitionName.split(' ').join('_'));
        await pngExport(
          exportData,
          processData,
          options.scaling,
          options.exportSelectionOnly,
          folder,
        );
      }
    }
  }

  if (needsZip) {
    downloadFile('PROCEED_Multiple-Processes_bpmn.zip', await zip!.generateAsync({ type: 'blob' }));
  }
}
