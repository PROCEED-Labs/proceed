import jsZip from 'jszip';

import { ProcessesExportData, ProcessExportData } from './export-preparation';
import { downloadFile, getSVGFromBPMN, getImageDimensions } from './util';

/**
 * Executes the logic that adds the file for a specific process version/collapsed subprocess
 *
 * @param processData the data of the complete process
 * @param version the specific version to handle
 * @param generateBlobFromSvgString function that is used to get the final blob that will be exported from the svg string of the process
 * @param filetype the filetype to use for the export file
 * @param isImport if the data to be added is part of an imported process
 * @param zipFolder the folder to add the svg to (optional since we can export a single file directly as an svg which is decided before this function is called)
 * @param subprocessId if a specific collapsed subprocess should be added this is the id of the subprocess element
 * @param subprocessName the name of the collapsed subprocess to be added
 */
async function addImageFile(
  processData: ProcessExportData,
  version: string,
  generateBlobFromSvgString: (svg: string) => Promise<Blob>,
  filetype: string,
  isImport = false,
  zipFolder?: jsZip | null,
  subprocessId?: string,
  subprocessName?: string,
) {
  const versionData = processData.versions[version];
  const svg = await getSVGFromBPMN(versionData.bpmn!, subprocessId);

  const blob = await generateBlobFromSvgString(svg);

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
    zipFolder.file(`${filename}.${filetype}`, blob);
  } else {
    downloadFile(`${filename}.${filetype}`, blob);
  }
}

/**
 * Allows to recursively add versions of the process and its imports to the folder
 *
 * @param processesData the data of all processes
 * @param processData the data of the complete process
 * @param version the specific version to handle
 * @param generateBlobFromSvgString function that is used to get the final blob that will be exported from the svg string of the process
 * @param filetype the filetype to use for the export file
 * @param isImport if the version is of an import
 * @param zipFolder the folder to add the svg to (optional since we can export a single file directly as an svg which is decided before this function is called)
 */
async function handleProcessVersionExport(
  processesData: ProcessesExportData,
  processData: ProcessExportData,
  version: string,
  generateBlobFromSvgString: (svg: string) => Promise<Blob>,
  filetype: string,
  isImport = false,
  zipFolder?: jsZip | null,
) {
  // add the main process (version) file
  await addImageFile(
    processData,
    version,
    generateBlobFromSvgString,
    filetype,
    isImport,
    zipFolder,
  );

  const versionData = processData.versions[version];
  // add collapsed subprocesses as additional files
  for (const { id: subprocessId, name: subprocessName } of versionData.subprocesses) {
    await addImageFile(
      processData,
      version,
      generateBlobFromSvgString,
      filetype,
      isImport,
      zipFolder,
      subprocessId,
      subprocessName,
    );
  }

  // recursively add imports as additional files into the same folder
  for (const { definitionId, processVersion } of versionData.imports) {
    const importData = processesData.find((el) => el.definitionId === definitionId);
    if (importData) {
      await handleProcessVersionExport(
        processesData,
        importData,
        processVersion,
        generateBlobFromSvgString,
        filetype,
        true,
        zipFolder,
      );
    }
  }
}

async function exportImage(
  processesData: ProcessesExportData,
  processData: ProcessExportData,
  generateBlobFromSvgString: (svg: string) => Promise<Blob>,
  filetype: string,
  zipFolder?: jsZip | null,
) {
  // only export the versions that were explicitly selected for export inside the folder for the given process
  const nonImportVersions = Object.entries(processData.versions)
    .filter(([_, { isImport }]) => !isImport)
    .map(([version]) => version);

  for (const version of nonImportVersions) {
    await handleProcessVersionExport(
      processesData,
      processData,
      version,
      generateBlobFromSvgString,
      filetype,
      false,
      zipFolder,
    );
  }
}

/**
 * Exports a process as a svg either as a single file or into a folder of a zip archive if multiple files should be exported
 *
 * Might export multiple files if imports or collapsed subprocesses should be exported as well
 *
 * @param processesData the data of all processes
 * @param processData the data of the complete process
 * @param zipFolder a zip folder the exported files should be added to in case of multi file export
 */
export async function svgExport(
  processesData: ProcessesExportData,
  processData: ProcessExportData,
  zipFolder?: jsZip | null,
) {
  await exportImage(
    processesData,
    processData,
    async (svg) => {
      return new Blob([svg], {
        type: 'image/svg+xml',
      });
    },
    'svg',
    zipFolder,
  );
}

/**
 * Exports a process as a png either as a single file or into a folder of a zip archive if multiple files should be exported
 *
 * Might export multiple files if imports or collapsed subprocesses should be exported as well
 *
 * @param processesData the data of all processes
 * @param processData the data of the complete process
 * @param scaling the scaling factor to use when transforming the process svg to a png
 * @param zipFolder  a zip folder the exported files should be added to in case of multi file export
 */
export async function pngExport(
  processesData: ProcessesExportData,
  processData: ProcessExportData,
  scaling: number,
  zipFolder?: jsZip | null,
) {
  await exportImage(
    processesData,
    processData,
    async (svg) => {
      const svgBlob = new Blob([svg], {
        type: 'image/svg+xml;charset=utf-8',
      });

      const pngBlob: Blob = await new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');

        const { width, height } = getImageDimensions(svg);
        const image = new Image(width, height);

        image.onload = async () => {
          try {
            canvas.width = scaling * image.width;
            canvas.height = scaling * image.height;

            const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
            ctx.imageSmoothingEnabled = false;
            ctx.scale(scaling, scaling);
            ctx.drawImage(image, 0, 0, width, height);

            const uri = canvas.toDataURL('image/png');
            const DATA_URL_REGEX = /^data:((?:\w+\/(?:(?!;).)+)?)((?:;[\w\W]*?[^;])*),(.+)$/;
            if (DATA_URL_REGEX.test(uri)) {
              const blob = await fetch(uri).then((res) => res.blob());
              resolve(blob);
            }
            URL.revokeObjectURL(uri);
          } catch (err) {
            reject('Failed creating png');
          }
        };

        image.src = URL.createObjectURL(svgBlob);
      });

      return pngBlob;
    },
    'png',
    zipFolder,
  );
}
