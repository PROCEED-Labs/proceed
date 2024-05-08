import {
  getProcess,
  getProcessBPMN,
  getProcessUserTaskHTML,
  getProcessImage,
} from '@/lib/data/processes';

import {
  getAllUserTaskFileNamesAndUserTaskIdsMapping,
  getAllBpmnFlowElements,
  getMetaDataFromElement,
  getElementsByTagName,
  toBpmnObject,
  getElementById,
  getElementDI,
  getDefinitionsVersionInformation,
  getDefinitionsAndProcessIdForEveryCallActivity,
} from '@proceed/bpmn-helper';

import { asyncMap, asyncFilter } from '../helpers/javascriptHelpers';
import { getImageDimensions, getSVGFromBPMN, isSelectedOrInsideSelected } from './util';

import { is as bpmnIs } from 'bpmn-js/lib/util/ModelUtil';

import { ArrayEntryType } from '../typescript-utils';

/**
 * The options that can be used to select what should be exported
 */
export type ProcessExportOptions = {
  type: 'bpmn' | 'svg' | 'png';
  artefacts: boolean; // if artefacts like images or user task html should be included in the export
  subprocesses: boolean; // if collapsed subprocesses should be exported as well (svg)
  imports: boolean; // if processes referenced by this process should be exported as well
  scaling: number; // the scaling factor that should be used for png export
  exportSelectionOnly: boolean; // if only selected elements (and their children) should be in the final export
  useWebshareApi: boolean; // if true, the process is shared using web share api
};

/**
 * The incoming information about the processes(and versions) to export
 */
export type ExportProcessInfo = {
  definitionId: string;
  processVersion?: number | string;
  selectedElements?: string[];
  rootSubprocessLayerId?: string;
}[];

/**
 * The data needed for the export of a specific process
 */
export type ProcessExportData = {
  definitionId: string;
  definitionName: string;
  isImport: boolean;
  versions: {
    [version: string]: {
      name?: string;
      bpmn: string;
      isImport: boolean;
      layers: { id?: string; name?: string }[];
      imports: { definitionId: string; processVersion: string }[];
      selectedElements?: string[];
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
async function getVersionBpmn(
  definitionId: string,
  spaceId: string,
  processVersion?: string | number,
) {
  processVersion = typeof processVersion === 'string' ? parseInt(processVersion) : processVersion;
  const bpmn = await getProcessBPMN(definitionId, spaceId, processVersion);

  if (typeof bpmn !== 'string') {
    throw bpmn.error;
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
async function getCollapsedSubprocessInfos(bpmn: string) {
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
    isImport: boolean;
    versions: {
      [version: string]: {
        name?: string;
        bpmn: string;
        isImport: boolean;
        layers: { id?: string; name?: string }[];
        imports: { definitionId: string; processVersion: string }[];
        selectedElements?: string[];
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

function getVersionName(version?: string | number) {
  return version ? `${version}` : 'latest';
}

async function getMaximumScalingFactor(exportData: ProcessesExportData) {
  const allVersionBpmns = exportData.flatMap(({ versions }) =>
    Object.values(versions).map(({ bpmn }) => bpmn),
  );

  const maximums = await asyncMap(allVersionBpmns, async (bpmn) => {
    const svg = await getSVGFromBPMN(bpmn);
    const diagramSize = getImageDimensions(svg);
    // the canvas that is used to transform the svg to a png has a limited size (https://github.com/jhildenbiddle/canvas-size#test-results)
    return Math.floor(Math.sqrt(268400000 / (diagramSize.width * diagramSize.height)));
  });

  return Math.min(...maximums);
}

/**
 * Will fetch information for a process (version) from the backend if it is not present in the exportData yet
 *
 * @param exportData the currently existing process data to export
 * @param processInfo the info that identifies the process (version) to fetch
 * @param isImport if the data should be marked as (only) required as part of an import if it was not fetched before
 */
async function ensureProcessInfo(
  exportData: ExportMap,
  {
    definitionId,
    processVersion,
    selectedElements,
    rootSubprocessLayerId,
  }: ArrayEntryType<ExportProcessInfo>,
  spaceId: string,
  isImport = false,
) {
  if (!exportData[definitionId]) {
    const process = await getProcess(definitionId, spaceId);

    if ('error' in process) {
      throw process.error;
    }

    exportData[definitionId] = {
      definitionName: process.name,
      isImport,
      versions: {},
      userTasks: [],
      images: [],
    };
  }

  // prevent (unlikely) situations where a version might be referenced once by number and once by string
  const versionName = getVersionName(processVersion);

  if (!exportData[definitionId].versions[versionName]) {
    const versionBpmn = await getVersionBpmn(definitionId, spaceId, processVersion);
    const versionInformation = await getDefinitionsVersionInformation(versionBpmn);

    // add the default root process layer if there is no rootSubprocessLayer given
    let rootLayer = { id: undefined };
    if (rootSubprocessLayerId) {
      // get the info for the selected root subprocess layer and add it as the default layer (regardless of collapsed subprocesses being selected in the options)
      const subprocessInfos = await getCollapsedSubprocessInfos(versionBpmn);
      const rootLayerInfo = subprocessInfos.find(({ id }) => id === rootSubprocessLayerId);
      if (rootLayerInfo) rootLayer = rootLayerInfo;
    }

    exportData[definitionId].versions[versionName] = {
      name: versionInformation.name,
      bpmn: versionBpmn,
      isImport,
      layers: [rootLayer],
      imports: [],
      selectedElements,
    };
  }
}

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
  spaceId: string,
): Promise<ProcessesExportData> {
  if (!processes.length) {
    throw new Error('Tried exporting without specifying the processes to export!');
  }

  const exportData: ExportMap = {};

  let processVersionsToAdd = processes.map((info) => ({ ...info, isImport: false }));

  // keep resolving process (version) information until no new information is required by imports
  while (processVersionsToAdd.length) {
    let newProcessVersionsToAdd: typeof processVersionsToAdd = [];
    // get the bpmn for all processes and their versions to export
    for (const {
      definitionId,
      processVersion,
      selectedElements,
      rootSubprocessLayerId,
      isImport,
    } of processVersionsToAdd) {
      await ensureProcessInfo(
        exportData,
        { definitionId, processVersion, selectedElements, rootSubprocessLayerId },
        spaceId,
        isImport,
      );

      // if the option to export referenced processes is selected make sure to fetch their information as well
      if (options.imports) {
        const versionName = getVersionName(processVersion);
        const { bpmn, imports, selectedElements, layers } =
          exportData[definitionId].versions[versionName];

        // check the bpmn for referenced processes
        const importInfo = await getDefinitionsAndProcessIdForEveryCallActivity(bpmn, true);

        if (options.type !== 'bpmn') {
          const bpmnObj = await toBpmnObject(bpmn);

          for (const callActivityId in importInfo) {
            const callActivity = getElementById(bpmnObj, callActivityId) as any;

            const inUnexportedLayer =
              // exlude if the importing call activity is in a nested collapsed subprocess but they are not exported
              (!options.subprocesses &&
                bpmnIs(callActivity.$parent, 'bpmn:SubProcess') &&
                callActivity.$parent.id !== layers[0].id) ||
              // exlude if the call activity importing this is not nested under the current layer
              (layers.length &&
                layers[0].id &&
                !(await isSelectedOrInsideSelected(bpmnObj, callActivityId, [layers[0].id])));

            // exclude if only selected elements should be exported and the importing call acitivity is not (indirectly) selected
            const notInSelection =
              options.exportSelectionOnly &&
              !(await isSelectedOrInsideSelected(bpmnObj, callActivityId, selectedElements || []));

            if (inUnexportedLayer || notInSelection) {
              delete importInfo[callActivityId];
            }
          }
        }

        for (const { definitionId: importDefinitionId, version: importVersion } of Object.values(
          importInfo,
        )) {
          // add the import information to the respective version
          imports.push({ definitionId: importDefinitionId, processVersion: `${importVersion}` });
          const importVersionName = getVersionName(importVersion);
          // mark the process (version) as to be added if there is no information for it
          if (!exportData[importDefinitionId]?.versions[importVersionName]) {
            newProcessVersionsToAdd.push({
              definitionId: importDefinitionId,
              processVersion: importVersion,
              isImport: true,
            });
          }
        }
      }
    }
    processVersionsToAdd = newProcessVersionsToAdd;
  }

  // get additional process information
  for (const definitionId of Object.keys(exportData)) {
    // get the ids of all collapsed subprocesses so they can be used later during export
    if (options.subprocesses) {
      for (const { bpmn, selectedElements, layers } of Object.values(
        exportData[definitionId].versions,
      )) {
        const bpmnObj = await toBpmnObject(bpmn);

        layers.push(
          ...(
            await asyncFilter(await getCollapsedSubprocessInfos(bpmn), async ({ id }) => {
              return (
                // prevent a layer from being added a second time (might have already been added as the root layer of the export)
                !layers.some((layer) => layer.id === id) &&
                // if the root layer is not the complete process filter out any subprocesses not nested under the root layer
                (!layers.length ||
                  !layers[0].id ||
                  (await isSelectedOrInsideSelected(bpmnObj, id, [layers[0].id]))) &&
                // if the user selected the option to limit the exports to (indirectly) selected elements remove subprocesses that are not (indirectly) selected
                (!options.exportSelectionOnly ||
                  (await isSelectedOrInsideSelected(bpmnObj, id, selectedElements || [])))
              );
            })
          )
            // the subprocess info is returned in the reversed order from what we want (we want from the outmost subprocess to the most nested)
            .reverse(),
        );
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
        const html = await getProcessUserTaskHTML(definitionId, filename, spaceId);

        if (typeof html !== 'string') {
          throw html.error;
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
        const image = await getProcessImage(definitionId, filename, spaceId);

        if ('error' in image) throw image.error;

        exportData[definitionId].images.push({
          filename,
          data: new Blob([image]),
        });
      }
    }
  }

  const finalExportData = Object.entries(exportData).map(([definitionId, data]) => ({
    ...data,
    definitionId,
  }));

  if (options.type === 'png') {
    // decrease the scaling factor if the image size would exceed export limits
    options.scaling = Math.min(options.scaling, await getMaximumScalingFactor(finalExportData));
  }

  return finalExportData;
}
