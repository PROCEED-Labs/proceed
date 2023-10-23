import {
  fetchProcessVersionBpmn,
  fetchProcess,
  fetchProcessUserTaskHTML,
  fetchProcessImageData,
} from '../process-queries';

import {
  getAllUserTaskFileNamesAndUserTaskIdsMapping,
  getAllBpmnFlowElements,
  getMetaDataFromElement,
  getElementsByTagName,
  toBpmnObject,
  getElementDI,
  getDefinitionsVersionInformation,
} from '@proceed/bpmn-helper';

/**
 * The options that can be used to select what should be exported
 */
export type ProcessExportOptions = {
  type: 'bpmn' | 'svg' | 'pdf';
  artefacts: boolean; // if artefacts like images or user task html should be included in the export
  subprocesses: boolean; // if collapsed subprocesses should be exported as well (svg, pdf)
};

/**
 * The incoming information about the processes(and versions) to export
 */
export type ExportProcessInfo = { definitionId: string; processVersion?: number | string }[];

/**
 * The data needed for the export of a specific process
 */
export type ProcessExportData = {
  definitionId: string;
  definitionName: string;
  versions: {
    [version: string]: {
      name?: string;
      bpmn: string;
      subprocesses: { id: string; name: string }[];
    };
  };
  userTasks: {
    filename: string;
    html: string;
  }[];
  images: {
    filename: string;
    data: Blob;
  }[];
};

/**
 * The data needed for the export of all processes
 */
export type ProcessesExportData = ProcessExportData[];

/**
 * Used to get the bpmn of a specific process version
 *
 * @param definitionId
 * @param processVersion
 */
async function getVersionBpmn(definitionId: string, processVersion?: string | number) {
  const bpmn = await fetchProcessVersionBpmn(definitionId, processVersion);

  if (!bpmn) {
    throw new Error(
      `Failed to get the bpmn for a version (${processVersion}) of a process (definitionId: ${definitionId})`,
    );
  }

  return bpmn;
}

/**
 * Returns the required locally (on the ms server) stored image data for all image elements inside the given html
 *
 * @param {string} html the html file that might reference locally stored images
 * @returns {string[]} an array containing information about all image files needed for the user task
 */
function getImagesReferencedByHtml(html: string) {
  try {
    const parser = new DOMParser();
    const htmlDOM = parser.parseFromString(html, 'text/html');

    const imageElements = Array.from(htmlDOM.getElementsByTagName('img'));

    // get the referenced images that are stored locally
    const seperatelyStored = imageElements
      .map((img) => img.src)
      .filter((src) => src.includes('/resources/process/'))
      .map((src) => src.split('/').pop())
      .filter((imageName): imageName is string => !!imageName);
    // remove duplicates
    return [...new Set(seperatelyStored)];
  } catch (err) {
    throw new Error('Unable to parse the image information from the given html');
  }
}

/**
 * Returns the ids of all subprocesses in the given bpmn that are not expanded
 *
 * @param bpmn
 */
async function getCollapsedSubprocessIds(bpmn: string) {
  const definitions = await toBpmnObject(bpmn);
  const subprocesses = getElementsByTagName(definitions, 'bpmn:SubProcess');

  const collapsedSubprocesses = subprocesses
    .filter((subprocess) => !getElementDI(subprocess, definitions).isExpanded)
    .map(({ id, name }) => ({ id, name }));

  return collapsedSubprocesses;
}

/**
 * Internal export data representation for easier referencing
 */
type ExportMap = {
  [definitionId: string]: {
    definitionName: string;
    versions: {
      [version: string]: {
        name?: string;
        bpmn: string;
        subprocesses: { id: string; name: string }[];
      };
    };
    userTasks: {
      filename: string;
      html: string;
    }[];
    images: {
      filename: string;
      data: Blob;
    }[];
  };
};

/**
 * Gets the data that is needed to export all the requested processes with the given options
 *
 * @param options the export options that were selected by the user
 * @param processes the processes(and versions) to export
 * @returns the data needed for the actual export
 */
export async function prepareExport(
  options: ProcessExportOptions,
  processes: ExportProcessInfo,
): Promise<ProcessesExportData> {
  if (!processes.length) {
    throw new Error('Tried exporting without specifying the processes to export!');
  }

  const exportData: ExportMap = {};
  // get the bpmn for all processes and their versions to export
  for (const { definitionId, processVersion } of processes) {
    const process = await fetchProcess(definitionId);

    if (!process) {
      throw new Error(
        `Failed to get process info (definitionId: ${definitionId}) during process export`,
      );
    }

    // prevent (unlikely) situations where a version might be referenced once by number and once by string
    const versionName = processVersion ? `${processVersion}` : 'latest';

    const versionBpmn = await getVersionBpmn(definitionId, processVersion);
    const versionInformation = await getDefinitionsVersionInformation(versionBpmn);

    exportData[definitionId] = {
      definitionName: process.definitionName,
      versions: {
        [versionName]: {
          name: versionInformation.name,
          bpmn: versionBpmn,
          subprocesses: [],
        },
      },
      userTasks: [],
      images: [],
    };

    // get the ids of all collapsed subprocesses so they can be used later during export
    if (options.subprocesses) {
      for (const [version, { bpmn }] of Object.entries(exportData[definitionId].versions)) {
        exportData[definitionId].versions[version].subprocesses =
          await getCollapsedSubprocessIds(bpmn);
      }
    }

    // fetch data for additional artefacts if requested in the options
    if (options.artefacts) {
      const allRequiredUserTaskFiles: Set<string> = new Set();
      const allRequiredImageFiles: Set<string> = new Set();

      // determine the user task files that are need per version and across all versions
      for (const [version, { bpmn }] of Object.entries(exportData[definitionId].versions)) {
        const versionUserTasks = Object.keys(
          await getAllUserTaskFileNamesAndUserTaskIdsMapping(bpmn),
        );

        for (const filename of versionUserTasks) allRequiredUserTaskFiles.add(filename);
      }

      // fetch the required user tasks files from the backend
      for (const filename of allRequiredUserTaskFiles) {
        const html = await fetchProcessUserTaskHTML(definitionId, filename);

        if (!html) {
          throw new Error(
            `Failed to get the html for a user task (filename: ${filename}) of a process (definitionId: ${definitionId})`,
          );
        }

        exportData[definitionId].userTasks.push({ filename, html });
      }

      // determine the images that are needed per version and across all versions
      for (const { bpmn } of Object.values(exportData[definitionId].versions)) {
        const flowElements = await getAllBpmnFlowElements(bpmn);

        flowElements.forEach((flowElement) => {
          const metaData = getMetaDataFromElement(flowElement);
          if (metaData.overviewImage) {
            allRequiredImageFiles.add(metaData.overviewImage.split('/').pop());
          }
        });
      }

      // determine the images that are used inside user tasks
      for (const { html } of exportData[definitionId].userTasks) {
        const referencedImages = getImagesReferencedByHtml(html);
        for (const filename of referencedImages) {
          allRequiredImageFiles.add(filename);
        }
      }

      // fetch the required image files from the backend
      for (const filename of allRequiredImageFiles) {
        exportData[definitionId].images.push({
          filename,
          data: await fetchProcessImageData(definitionId, filename),
        });
      }
    }
  }

  return Object.entries(exportData).map(([definitionId, data]) => ({
    ...data,
    definitionId,
  }));
}
