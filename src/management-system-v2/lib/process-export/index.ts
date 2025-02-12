import {
  prepareExport,
  ProcessExportOptions,
  ExportProcessInfo,
  ProcessExportData,
} from './export-preparation';

import { getProcessFilePathName, handleExportMethod } from './util';

import jsZip from 'jszip';

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

    // If there isn't a zip folder, there is only one thing to export
    if (!zipFolder) return { filename: `${getProcessFilePathName(filename)}.bpmn`, blob: bpmnBlob };

    zipFolder.file(`${getProcessFilePathName(filename)}.bpmn`, bpmnBlob);
  }

  if (zipFolder) {
    // export the script tasks of the process
    if (processData.scriptTasks.length) {
      const scriptTaskFolder = zipFolder.folder('script-tasks');
      for (const { filename, js, ts, xml } of processData.scriptTasks) {
        if (js) {
          const jsBlob = new Blob([js], { type: 'application/javascript' });
          scriptTaskFolder?.file(filename + '.js', jsBlob);
        }
        if (ts) {
          const tsBlob = new Blob([ts], { type: 'application/javascript' });
          scriptTaskFolder?.file(filename + '.ts', tsBlob);
        }
        if (xml) {
          const xmlBlob = new Blob([xml], { type: 'application/xml' });
          scriptTaskFolder?.file(filename + '.xml', xmlBlob);
        }
      }
    }

    // export the user tasks of the process
    if (processData.userTasks.length) {
      const userTaskFolder = zipFolder.folder('user-tasks');
      for (const { filename, json, html } of processData.userTasks) {
        const jsonBlob = new Blob([json], { type: 'application/json' });
        userTaskFolder?.file(filename + '.json', jsonBlob);
        const htmlBlob = new Blob([html], { type: 'application/html' });
        userTaskFolder?.file(filename + '.html', htmlBlob);
      }
    }
    // export the images used either for flow elements or inside user tasks
    if (processData.images.length) {
      const imageFolder = zipFolder.folder('images');
      for (const { filename, data: imageData } of processData.images) {
        imageFolder?.file(filename, imageData);
      }
    }
  }
}
export async function getExportblob(
  options: ProcessExportOptions,
  processes: ExportProcessInfo,
  spaceId: string,
) {
  const exportData = await prepareExport(options, processes, spaceId);

  // for other export types we need one file for every kind of additional data (artefacts, collapsed subprocesses, imports)
  const numProcesses = exportData.length;
  // the following cases are only relevant if there is only one process to export (in any other case needsZip becomes true anyway)
  const hasMulitpleVersions = Object.keys(exportData[0].versions).length > 1;
  const hasArtefacts =
    !!exportData[0].userTasks.length ||
    !!exportData[0].scriptTasks.length ||
    !!exportData[0].images.length;
  // this becomes relevant if there is only one version (otherwise hasMultipleVersions will lead to needsZip being true anyway)
  const withSubprocesses = Object.values(exportData[0].versions)[0].layers.length > 1;

  // determine if a zip export is required
  const needsZip = numProcesses > 1 || hasMulitpleVersions || hasArtefacts || withSubprocesses;

  const zip = needsZip ? new jsZip() : undefined;
  let blob: { filename: string; blob: Blob } | undefined = undefined;

  for (const processData of exportData) {
    if (options.type === 'bpmn') {
      const folder = zip?.folder(getProcessFilePathName(processData.definitionName));
      blob = await bpmnExport(processData, folder);
    }
    // handle imports inside the svgExport function
    if (options.type === 'svg' && !processData.isImport) {
      const folder = zip?.folder(getProcessFilePathName(processData.definitionName));
      blob = await svgExport(exportData, processData, options, folder);
    }
    if (options.type === 'png' && !processData.isImport) {
      const folder = zip?.folder(getProcessFilePathName(processData.definitionName));
      blob = await pngExport(exportData, processData, options, folder);
    }
  }

  if (zip) {
    return {
      filename: 'PROCEED_Multiple-Processes_bpmn.zip',
      blob: await zip.generateAsync({ type: 'blob' }),
      zip: true,
    };
  } else {
    return blob!;
  }
}

/**
 * Exports the given processes either as a single file or if necessary inside a zip file
 *
 * @param options the options that were selected by the user
 * @param processes the processes(and versions) to export
 */
export function exportProcesses(
  options: ProcessExportOptions,
  processes: ExportProcessInfo,
  spaceId: string,
) {
  const blob = getExportblob(options, processes, spaceId);

  return handleExportMethod(blob, options);
}
